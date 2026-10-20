"use client";

import { SourceSheet } from "@/components/source-sheet";
import { Badge } from "@/components/ui/badge";
import { STARTERS } from "@/lib/starters";
import {
  AgentInterface,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
  useSystemThemeMode,
  WelcomeMascot,
} from "@openuidev/react-ui";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { useEffect } from "react";

const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIAdapter(),
  messageFormat: openAIMessageFormat,
});

const starterCards = STARTERS.map(({ displayText, prompt }) => ({ displayText, prompt }));

export function ChatApp({ demoMode, missingKey }: { demoMode: boolean; missingKey: boolean }) {
  const mode = useSystemThemeMode();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      {demoMode ? (
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-sm">
          <Badge variant="secondary">demo mode</Badge>
          <span>
            No model call. Starters stream canned OpenUI Lang through the same route and renderer. Set
            OPENAI_API_KEY for a live model.
          </span>
        </div>
      ) : null}
      {missingKey && !demoMode ? (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <Badge variant="destructive">missing key</Badge>
          <span>Set OPENAI_API_KEY, or unset MOCK_LLM so demo mode can answer.</span>
        </div>
      ) : null}
      <div className="openui-shell min-h-0 flex-1">
        <AgentInterface
          llm={llm}
          componentLibrary={openuiLibrary}
          agentName="OpenUI"
          starters={starterCards}
          starterVariant="card"
          theme={{ mode }}
        >
          <AgentInterface.SidebarHeader agentName="OpenUI" />
          <AgentInterface.ThreadHeader>
            <SourceSheet />
          </AgentInterface.ThreadHeader>
          <AgentInterface.MobileHeader actions={<SourceSheet />} />
          <AgentInterface.Welcome
            image={<WelcomeMascot />}
            title="What should we draw?"
            description="Ask for a table, a chart, or a form. The reply streams in as real components."
            starterVariant="card"
            glowAnimation
          />
        </AgentInterface>
      </div>
    </div>
  );
}
