import { READ_TOOLS, WRITE_TOOLS, type DeskTool, type WriteTool } from "./types"

export type Gate = "allow" | "ask" | "refuse"

export function gateFor(tool: string): Gate {
  if ((WRITE_TOOLS as readonly string[]).includes(tool)) return "ask"
  if ((READ_TOOLS as readonly string[]).includes(tool)) return "allow"
  return "refuse"
}

export function isWriteTool(tool: string): tool is WriteTool {
  return gateFor(tool) === "ask"
}

export function isDeskTool(tool: string): tool is DeskTool {
  return gateFor(tool) !== "refuse"
}

export function approvedContent(summary: string): string {
  return `Approved by Jun Park. ${summary} Saved on this machine. Nothing was sent.`
}

export function rejectedContent(): string {
  return "Rejected by Jun Park. Do not send, book, or retry this action."
}
