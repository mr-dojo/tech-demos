import { afterEach, describe, expect, test } from "bun:test";
import { POST } from "@/app/api/chat/route";
import { setChatRuntimeForTests, type ChatRuntime } from "@/lib/chat-runtime";
import { demoChunk } from "@/lib/sse";

const originalKey = process.env.OPENAI_API_KEY;
const originalMock = process.env.MOCK_LLM;
const originalDelay = process.env.MOCK_STREAM_DELAY_MS;

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  if (originalMock === undefined) delete process.env.MOCK_LLM;
  else process.env.MOCK_LLM = originalMock;
  if (originalDelay === undefined) delete process.env.MOCK_STREAM_DELAY_MS;
  else process.env.MOCK_STREAM_DELAY_MS = originalDelay;
  setChatRuntimeForTests(null);
});

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/chat", () => {
  test("rejects an empty messages array", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.MOCK_LLM;
    const response = await post({ messages: [] });
    expect(response.status).toBe(400);
  });

  test("demo mode streams data lines and ends with [DONE]", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.MOCK_LLM;
    process.env.MOCK_STREAM_DELAY_MS = "0";
    const response = await post({
      messages: [{ role: "user", content: "Show a table of 3 planets with mass and moons" }],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-OpenUI-Mode")).toBe("demo");
    const text = await response.text();
    expect(text.startsWith("data: ")).toBe(true);
    expect(text).toContain("Table(");
    expect(text.trimEnd().endsWith("data: [DONE]")).toBe(true);
  });

  test("a mocked OpenAI client streams data lines and ends with [DONE]", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.MOCK_LLM = "0";
    const runtime: ChatRuntime = {
      tools: () => [],
      async createStream() {
        return (async function* () {
          yield demoChunk({ role: "assistant", content: "root = Stack([title])\n" }, null);
          yield demoChunk({ content: 'title = TextContent("Hello")\n' }, "stop");
        })();
      },
    };
    setChatRuntimeForTests(runtime);
    const response = await post({ messages: [{ role: "user", content: "Say hello as a card" }] });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-OpenUI-Mode")).toBe("live");
    const text = await response.text();
    expect(text.includes("data: ")).toBe(true);
    expect(text).toContain("TextContent");
    expect(text.trimEnd().endsWith("data: [DONE]")).toBe(true);
  });
});
