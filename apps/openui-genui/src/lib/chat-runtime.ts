import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { openAIConfig } from "@/lib/env";
import { catalogTools } from "@/lib/tools";

export type ChatCompletionStream = AsyncIterable<ChatCompletionChunk>;

export type ChatRuntime = {
  tools: () => ChatCompletionTool[];
  createStream: (params: ChatCompletionCreateParamsStreaming, signal: AbortSignal) => Promise<ChatCompletionStream>;
};

function liveRuntime(): ChatRuntime {
  return {
    tools: () => catalogTools(),
    async createStream(params, signal) {
      const { apiKey, baseURL } = openAIConfig();
      const client = new OpenAI({ apiKey, baseURL });
      return client.chat.completions.create(params, { signal });
    },
  };
}

let runtime: ChatRuntime = liveRuntime();

export function getChatRuntime(): ChatRuntime {
  return runtime;
}

/** Test hook. Pass null to restore the live OpenAI client. */
export function setChatRuntimeForTests(next: ChatRuntime | null): void {
  runtime = next ?? liveRuntime();
}
