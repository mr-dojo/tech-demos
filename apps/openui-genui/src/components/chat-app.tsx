"use client";

import { SourceSheet } from "@/components/source-sheet";
import { Badge } from "@/components/ui/badge";
import { STARTERS } from "@/lib/starters";
import {
  AgentInterface,
  createTheme,
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

const voltlineTheme = createTheme({
  interactiveAccentDefault: "oklch(0.72 0.16 75)",
  interactiveAccentHover: "oklch(0.66 0.15 72)",
  interactiveAccentPressed: "oklch(0.58 0.14 68)",
  textBrand: "oklch(0.45 0.12 70)",
});

export function ChatApp({ demoMode, missingKey }: { demoMode: boolean; missingKey: boolean }) {
  const mode = useSystemThemeMode();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <span className="voltline-mark grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold">
          V
        </span>
        <div className="min-w-0">
          <div className="font-semibold tracking-tight">Voltline PC</div>
          <div className="truncate text-xs text-muted-foreground">Build desk · sample catalog</div>
        </div>
        {demoMode ? (
          <Badge variant="secondary" className="ml-auto shrink-0">
            demo mode
          </Badge>
        ) : null}
        {missingKey && !demoMode ? (
          <Badge variant="destructive" className="ml-auto shrink-0">
            missing key
          </Badge>
        ) : null}
      </header>
      {demoMode ? (
        <div className="border-b border-border bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground">
          No model call. Starters stream canned OpenUI Lang for a sample shopper. Set OPENAI_API_KEY for a live model.
        </div>
      ) : null}
      {missingKey && !demoMode ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
          Set OPENAI_API_KEY, or unset MOCK_LLM so demo mode can answer.
        </div>
      ) : null}
      <div className="openui-shell min-h-0 flex-1">
        <AgentInterface
          llm={llm}
          componentLibrary={openuiLibrary}
          agentName="Voltline"
          starters={starterCards}
          starterVariant="card"
          theme={{ mode, lightTheme: voltlineTheme }}
        >
          <AgentInterface.SidebarHeader agentName="Voltline PC" />
          <AgentInterface.ThreadHeader>
            <SourceSheet />
          </AgentInterface.ThreadHeader>
          <AgentInterface.MobileHeader actions={<SourceSheet />} />
          <AgentInterface.Welcome
            image={<WelcomeMascot />}
            title="What are you building?"
            description="Ask for a parts list, an order, or an in-store pickup. The reply streams in as real components."
            starterVariant="card"
            glowAnimation
          />
        </AgentInterface>
      </div>
    </div>
  );
}
