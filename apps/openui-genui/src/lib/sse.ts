import type { ChatCompletionChunk } from "openai/resources/chat/completions";

const encoder = new TextEncoder();

export function demoChunk(
  delta: ChatCompletionChunk.Choice["delta"],
  finish: ChatCompletionChunk.Choice["finish_reason"],
): ChatCompletionChunk {
  return {
    id: "chatcmpl-demo",
    object: "chat.completion.chunk",
    created: 1,
    model: "demo",
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finish,
      },
    ],
  };
}

/** Split OpenUI Lang into small deltas so the renderer paints while the reply streams. */
export function chunkText(source: string, size = 16): string[] {
  const pieces: string[] = [];
  for (let index = 0; index < source.length; index += size) {
    pieces.push(source.slice(index, index + size));
  }
  return pieces.length > 0 ? pieces : [""];
}

export function demoChunks(source: string): ChatCompletionChunk[] {
  const pieces = chunkText(source);
  return [
    demoChunk({ role: "assistant", content: "" }, null),
    ...pieces.map((piece, index) => demoChunk({ content: piece }, index === pieces.length - 1 ? "stop" : null)),
  ];
}

export function encodeSse(chunk: ChatCompletionChunk | "[DONE]"): Uint8Array {
  if (chunk === "[DONE]") return encoder.encode("data: [DONE]\n\n");
  return encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function sseResponse(chunks: AsyncIterable<ChatCompletionChunk>, signal: AbortSignal, delayMs: number): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          if (signal.aborted) break;
          controller.enqueue(encodeSse(chunk));
          if (delayMs > 0) await wait(delayMs, signal);
        }
        if (!signal.aborted) controller.enqueue(encodeSse("[DONE]"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function* chunksFrom(chunks: ChatCompletionChunk[]): AsyncGenerator<ChatCompletionChunk> {
  for (const chunk of chunks) yield chunk;
}
