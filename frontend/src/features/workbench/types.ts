import { z } from "zod";

export const entitySchema = z.object({
  text: z.string(),
  label: z.string(),
  start: z.number(),
  end: z.number(),
});

export const exportArtifactSchema = z.object({
  format: z.enum(["markdown", "docx", "epub"]),
  filename: z.string(),
  mime_type: z.string(),
  base64: z.string(),
  size_bytes: z.number(),
});

export const documentResultSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  text: z.string(),
  metadata: z.record(z.string()),
  entities: z.array(entitySchema),
  people: z.array(z.string()),
  dates: z.array(z.string()),
  outputs: z.array(exportArtifactSchema),
  tool_versions: z.record(z.string()),
  warnings: z.array(z.string()),
  processing_ms: z.number(),
});

export type DocumentResult = z.infer<typeof documentResultSchema>;
export type ExportArtifact = z.infer<typeof exportArtifactSchema>;

export const healthSchema = z.object({
  status: z.string(),
  version: z.string(),
  commit: z.string(),
});

export type Health = z.infer<typeof healthSchema>;
