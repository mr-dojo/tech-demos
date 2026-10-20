import { describe, expect, test } from "bun:test";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { ChatRuntime } from "@/lib/chat-runtime";
import { demoChunk } from "@/lib/sse";
import { runToolLoop } from "@/lib/tool-loop";

function toolChunk(
  delta: ChatCompletionChunk.Choice["delta"],
  finish: ChatCompletionChunk.Choice["finish_reason"],
): ChatCompletionChunk {
  return demoChunk(delta, finish);
}

describe("runToolLoop", () => {
  test("runs a tool then relays only the final text", async () => {
    const calls: unknown[] = [];
    let step = 0;
    const runtime: ChatRuntime = {
      tools: () => [],
      async createStream() {
        step += 1;
        if (step === 1) {
          return (async function* () {
            yield toolChunk(
              {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_1",
                    type: "function",
                    function: { name: "get_weather", arguments: "" },
                  },
                ],
              },
              null,
            );
            yield toolChunk(
              {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: '{"location":"Berlin"}' },
                  },
                ],
              },
              "tool_calls",
            );
          })();
        }
        return (async function* () {
          yield toolChunk({ content: "root = Stack([title])\n" }, null);
          yield toolChunk({ content: 'title = TextContent("Hi")\n' }, "stop");
        })();
      },
    };

    const chunks = [];
    for await (const chunk of runToolLoop({
      runtime,
      model: "test",
      messages: [{ role: "user", content: "weather in Berlin" }],
      signal: new AbortController().signal,
      executeTool: async (name, args) => {
        calls.push({ name, args });
        return JSON.stringify({ place: "Berlin", temperature_c: 12 });
      },
      maxSteps: 5,
    })) {
      chunks.push(chunk);
    }

    expect(calls).toEqual([{ name: "get_weather", args: { location: "Berlin" } }]);
    const text = chunks.map((chunk) => chunk.choices[0]?.delta?.content ?? "").join("");
    expect(text).toContain('TextContent("Hi")');
    expect(chunks.some((chunk) => chunk.choices[0]?.delta?.tool_calls)).toBe(false);
  });
});
