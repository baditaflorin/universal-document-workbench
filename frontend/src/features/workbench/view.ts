import { downloadJSON } from "../../lib/download";
import type { DocumentResult } from "./types";
import type { WorkspaceTab } from "./state";

const baseTabs = [
  "Workspace",
  "Analysis",
  "Text",
  "Metadata",
  "Entities",
  "Exports",
] as const;

export function buildVisibleTabs(debugEnabled: boolean): WorkspaceTab[] {
  return debugEnabled ? [...baseTabs, "Debug"] : [...baseTabs];
}

export function copyResultJson(result: DocumentResult): string {
  return JSON.stringify(result, null, 2);
}

export function downloadResultJson(result: DocumentResult): void {
  downloadJSON(`${result.filename}.result.json`, result);
}
