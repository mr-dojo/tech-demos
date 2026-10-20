import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const requestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.string(),
          content: z.unknown().optional(),
        })
        .passthrough(),
    )
    .min(1),
});

export type ChatBodyError = { status: number; error: string };

export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("");
}

/**
 * Keep user and assistant text. Drop client system messages and tool-call
 * bookkeeping — the server runs tools itself on every turn.
 */
export function sanitizeMessages(
  messages: Array<{ role: string; content?: unknown }>,
): ChatCompletionMessageParam[] {
  const sanitized: ChatCompletionMessageParam[] = [];
  for (const message of messages) {
    const text = contentToText(message.content).trim();
    if (!text) continue;
    if (message.role === "user") {
      sanitized.push({ role: "user", content: text });
    } else if (message.role === "assistant") {
      sanitized.push({ role: "assistant", content: text });
    }
  }
  return sanitized;
}

export function lastUserText(messages: Array<{ role: string; content?: unknown }>): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user") return contentToText(message.content).trim();
  }
  return "";
}

export function parseChatBody(
  raw: unknown,
): { ok: true; messages: ChatCompletionMessageParam[]; userText: string } | { ok: false; error: ChatBodyError } {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { status: 400, error: "messages must be a non-empty array" } };
  }
  const userText = lastUserText(parsed.data.messages);
  if (!userText) {
    return { ok: false, error: { status: 400, error: "messages must include a user message" } };
  }
  return { ok: true, messages: sanitizeMessages(parsed.data.messages), userText };
}
