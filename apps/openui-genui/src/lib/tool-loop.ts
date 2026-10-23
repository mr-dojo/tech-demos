import type { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatCompletionStream, ChatRuntime } from "@/lib/chat-runtime";

type ToolCallDraft = { id: string; name: string; arguments: string };

const MAX_STEPS = 5;

function accumulateToolCalls(
  calls: Map<number, ToolCallDraft>,
  deltas: NonNullable<ChatCompletionChunk.Choice["delta"]["tool_calls"]>,
): void {
  for (const delta of deltas) {
    const current = calls.get(delta.index) ?? { id: "", name: "", arguments: "" };
    if (delta.id) current.id = delta.id;
    if (delta.function?.name) current.name += delta.function.name;
    if (delta.function?.arguments) current.arguments += delta.function.arguments;
    calls.set(delta.index, current);
  }
}

/**
 * Chat Completions tool loop. Intermediate tool-call chunks stay on the server:
 * `openAIAdapter` cannot attach a tool result, so relaying a call with no result
 * leaves the timeline stuck on "streaming". The final text answer is relayed.
 */
export async function* runToolLoop(options: {
  runtime: ChatRuntime;
  model: string;
  messages: ChatCompletionMessageParam[];
  signal: AbortSignal;
  executeTool: (name: string, args: unknown, signal: AbortSignal) => Promise<string>;
  maxSteps?: number;
}): AsyncGenerator<ChatCompletionChunk> {
  const maxSteps = options.maxSteps ?? MAX_STEPS;
  const messages = [...options.messages];

  for (let step = 0; step < maxSteps; step += 1) {
    const forceAnswer = step === maxSteps - 1;
    const stream: ChatCompletionStream = await options.runtime.createStream(
      {
        model: options.model,
        messages,
        stream: true,
        ...(forceAnswer
          ? {}
          : {
              tools: options.runtime.tools(),
              tool_choice: "auto" as const,
            }),
      },
      options.signal,
    );

    const buffered: ChatCompletionChunk[] = [];
    const calls = new Map<number, ToolCallDraft>();
    let finish: string | null = null;
    let content = "";

    for await (const chunk of stream) {
      buffered.push(chunk);
      const choice = chunk.choices[0];
      const delta = choice?.delta;
      if (delta?.content) content += delta.content;
      if (delta?.tool_calls) accumulateToolCalls(calls, delta.tool_calls);
      if (choice?.finish_reason) finish = choice.finish_reason;
    }

    if (finish === "tool_calls" && calls.size > 0 && !forceAnswer) {
      const toolCalls = [...calls.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([, call]) => ({
          id: call.id || `call_${step}_${call.name || "tool"}`,
          name: call.name,
          arguments: call.arguments,
        }));
      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      });
      for (const call of toolCalls) {
        let args: unknown = {};
        try {
          args = call.arguments ? (JSON.parse(call.arguments) as unknown) : {};
        } catch {
          args = {};
        }
        const result = await options.executeTool(call.name, args, options.signal);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
      continue;
    }

    for (const chunk of buffered) yield chunk;
    return;
  }
}
