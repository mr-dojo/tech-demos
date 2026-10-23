function flag(value: string | undefined): "on" | "off" | "unset" {
  if (value === undefined || value.trim() === "") return "unset";
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return "on";
  if (["0", "false", "no", "off"].includes(normalized)) return "off";
  return "unset";
}

export type OpenAIConfig = {
  apiKey: string;
  baseURL: string | undefined;
  model: string;
};

/** Live-model settings. `apiKey` is empty when the environment has no key. */
export function openAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.2";
  return { apiKey, baseURL, model };
}

/**
 * Demo mode streams canned OpenUI Lang through the same chat route.
 * `MOCK_LLM=1` forces it. A missing key turns it on unless `MOCK_LLM=0`.
 */
export function isDemoMode(): boolean {
  const mock = flag(process.env.MOCK_LLM);
  if (mock === "on") return true;
  if (mock === "off") return false;
  return openAIConfig().apiKey.length === 0;
}

/** Milliseconds between demo SSE chunks. `MOCK_STREAM_DELAY_MS=0` disables the pause. */
export function mockStreamDelayMs(): number {
  const raw = process.env.MOCK_STREAM_DELAY_MS;
  if (raw === undefined || raw.trim() === "") return 30;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 30;
  return parsed;
}
