import { z } from "zod";
import { documentResultSchema } from "./types";

export const workspaceTabSchema = z.enum([
  "Workspace",
  "Analysis",
  "Text",
  "Metadata",
  "Entities",
  "Exports",
  "Debug",
]);

export type WorkspaceTab = z.infer<typeof workspaceTabSchema>;

export const sourceModeSchema = z.enum(["upload", "paste", "url", "sample"]);
export type SourceMode = z.infer<typeof sourceModeSchema>;

export const workbenchSettingsSchema = z.object({
  apiBaseUrl: z.string(),
  autosave: z.boolean(),
  historyLimit: z.number().int().min(1).max(12),
});

export type WorkbenchSettings = z.infer<typeof workbenchSettingsSchema>;

export const workbenchSnapshotSchema = z.object({
  schema_version: z.literal("2026-05-09.phase3"),
  saved_at: z.string(),
  active_tab: workspaceTabSchema,
  source_mode: sourceModeSchema,
  pasted_text: z.string(),
  source_url: z.string(),
  selected_result_id: z.string().nullable(),
  settings: workbenchSettingsSchema,
  results: z.array(documentResultSchema),
});

export type WorkbenchSnapshot = z.infer<typeof workbenchSnapshotSchema>;

export const defaultWorkbenchSettings: WorkbenchSettings = {
  apiBaseUrl: "http://localhost:8080",
  autosave: true,
  historyLimit: 6,
};

export function buildWorkbenchSnapshot(input: {
  activeTab: WorkspaceTab;
  sourceMode: SourceMode;
  pastedText: string;
  sourceUrl: string;
  selectedResultId: string | null;
  settings: WorkbenchSettings;
  results: z.infer<typeof documentResultSchema>[];
}): WorkbenchSnapshot {
  return {
    schema_version: "2026-05-09.phase3",
    saved_at: new Date().toISOString(),
    active_tab: input.activeTab,
    source_mode: input.sourceMode,
    pasted_text: input.pastedText,
    source_url: input.sourceUrl,
    selected_result_id: input.selectedResultId,
    settings: input.settings,
    results: input.results,
  };
}

export function trimResults<T extends { id: string }>(
  results: T[],
  historyLimit: number,
): T[] {
  const deduped: T[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (seen.has(result.id)) {
      continue;
    }
    seen.add(result.id);
    deduped.push(result);
    if (deduped.length >= historyLimit) {
      break;
    }
  }
  return deduped;
}
