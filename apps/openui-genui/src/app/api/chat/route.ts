import { getChatRuntime } from "@/lib/chat-runtime";
import { isDemoMode, mockStreamDelayMs, openAIConfig } from "@/lib/env";
import { parseChatBody } from "@/lib/messages";
import { matchDemo } from "@/lib/mock-lang";
import { buildSystemPrompt } from "@/lib/prompt";
import { chunksFrom, demoChunks, sseResponse } from "@/lib/sse";
import { runToolLoop } from "@/lib/tool-loop";
import { executeTool } from "@/lib/tools";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";

const MAX_BODY_CHARS = 1_000_000;

function jsonError(status: number, error: string): Response {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store", "X-OpenUI-Mode": isDemoMode() ? "demo" : "live" } },
  );
}

/** Pull the first chunk so a provider failure becomes an HTTP error, not a 200 with a dead stream. */
async function responseFromChunks(
  chunks: AsyncGenerator<ChatCompletionChunk>,
  signal: AbortSignal,
  delayMs: number,
  mode: "demo" | "live",
): Promise<Response> {
  const iterator = chunks[Symbol.asyncIterator]();
  let first: IteratorResult<ChatCompletionChunk>;
  try {
    first = await iterator.next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model request failed";
    return jsonError(502, message);
  }

  async function* rest(): AsyncGenerator<ChatCompletionChunk> {
    if (!first.done && first.value) yield first.value;
    while (true) {
      const next = await iterator.next();
      if (next.done || !next.value) return;
      yield next.value;
    }
  }

  const response = sseResponse(rest(), signal, delayMs);
  response.headers.set("X-OpenUI-Mode", mode);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return jsonError(400, "messages must be a non-empty array");
  }
  if (raw.length > MAX_BODY_CHARS) return jsonError(413, "request body is too large");

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return jsonError(400, "messages must be a non-empty array");
  }

  const body = parseChatBody(payload);
  if (!body.ok) return jsonError(body.error.status, body.error.error);

  if (isDemoMode()) {
    const source = matchDemo(body.userText).source;
    return responseFromChunks(chunksFrom(demoChunks(source)), request.signal, mockStreamDelayMs(), "demo");
  }

  if (!openAIConfig().apiKey) {
    return jsonError(
      503,
      "OPENAI_API_KEY is not set. Leave MOCK_LLM unset, or set MOCK_LLM=1, to use demo mode.",
    );
  }

  const chunks = runToolLoop({
    runtime: getChatRuntime(),
    model: openAIConfig().model,
    messages: [{ role: "system", content: buildSystemPrompt() }, ...body.messages],
    signal: request.signal,
    executeTool,
  });
  return responseFromChunks(chunks, request.signal, 0, "live");
}
