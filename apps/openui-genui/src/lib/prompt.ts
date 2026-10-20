import { generateSystemPrompt, type LibrarySpec, type SystemPromptOptions } from "@openuidev/lang-core";
import spec from "@/generated/spec.json";

const APP_PREAMBLE = [
  "You are a generative UI assistant inside a single-user demo.",
  "Reply with OpenUI Lang only. Do not wrap the program in markdown fences and do not add prose outside the program.",
  "Start with `root = Stack(...)` so the layout streams before its contents.",
  "Use Table for comparisons, BarChart or LineChart for trends, Form when the user should submit something, and Cards for side-by-side options.",
  "When the user asks about weather, temperature, rain, or what to wear, call the get_weather tool before answering and render the returned place, temperature, conditions, and wind. Never invent weather numbers.",
].join(" ");

type GeneratedSpec = LibrarySpec & {
  promptOptions?: SystemPromptOptions;
};

const { promptOptions: generatedOptions, ...library } = spec as GeneratedSpec;

let cached: string | null = null;

/** System prompt built from the generated library spec plus this app's instructions. */
export function buildSystemPrompt(): string {
  if (cached) return cached;
  cached = generateSystemPrompt({
    library,
    promptOptions: {
      ...generatedOptions,
      preamble: APP_PREAMBLE,
    },
  });
  return cached;
}
