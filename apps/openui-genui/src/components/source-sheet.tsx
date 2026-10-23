"use client";

import { useThread } from "@openuidev/react-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function lastAssistantLang(messages: ReadonlyArray<{ role: string; content?: unknown }>): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant" && typeof message.content === "string" && message.content.trim()) {
      return message.content;
    }
  }
  return "";
}

/** Raw OpenUI Lang for the latest assistant reply, plus a rough size. */
export function SourceSheet() {
  const lang = useThread((state) => lastAssistantLang(state.messages));
  const characters = lang.length;
  const tokens = characters === 0 ? 0 : Math.max(1, Math.round(characters / 4));

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="sm" type="button" />}
      >
        Source
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl"
        style={{ width: "min(36rem, 100vw)", maxWidth: "36rem" }}
      >
        <SheetHeader>
          <SheetTitle>OpenUI Lang</SheetTitle>
          <SheetDescription>
            The latest reply, before the renderer turned it into components.
          </SheetDescription>
          <div className="flex gap-2 pt-2">
            <Badge variant="secondary">{characters} characters</Badge>
            <Badge variant="outline">~{tokens} tokens</Badge>
          </div>
        </SheetHeader>
        {lang ? (
          <pre className="mx-4 mb-4 flex-1 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 text-foreground">
            {lang}
          </pre>
        ) : (
          <p className="px-4 text-sm text-muted-foreground">
            Ask Voltline for a build to see the OpenUI Lang behind the reply.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
