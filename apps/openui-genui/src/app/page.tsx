import { ChatApp } from "@/components/chat-app";
import { isDemoMode, openAIConfig } from "@/lib/env";
import { connection } from "next/server";

// Runtime env (OPENAI_API_KEY / MOCK_LLM) decides the demo badge, so this
// route is allowed to block instead of failing the instant-shell check.
export const instant = false;

export default async function Home() {
  await connection();
  const missingKey = openAIConfig().apiKey.length === 0;
  return <ChatApp demoMode={isDemoMode()} missingKey={missingKey} />;
}
