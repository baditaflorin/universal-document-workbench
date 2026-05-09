import { z } from "zod";

export const confidenceSchema = z.object({
  score: z.number(),
  label: z.enum(["low", "medium", "high"]),
});

export const entitySchema = z.object({
  text: z.string(),
  label: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: confidenceSchema,
});

export const exportArtifactSchema = z.object({
  format: z.enum(["markdown", "docx", "epub"]),
  filename: z.string(),
  mime_type: z.string(),
  base64: z.string(),
  size_bytes: z.number(),
  confidence: confidenceSchema,
});

export const tableAnalysisSchema = z.object({
  detected: z.boolean(),
  delimiter: z.string(),
  rows: z.number(),
  columns: z.number(),
  confidence: confidenceSchema,
  header_names: z.array(z.string()),
});

export const fieldInferenceSchema = z.object({
  name: z.string(),
  type: z.string(),
  confidence: confidenceSchema,
  evidence: z.array(z.string()),
});

export const decisionSchema = z.object({
  code: z.string(),
  message: z.string(),
  confidence: confidenceSchema,
  evidence: z.array(z.string()),
});

export const diagnosticSchema = z.object({
  code: z.string(),
  severity: z.enum(["info", "warning", "error"]).or(z.string()),
  message: z.string(),
  evidence: z.array(z.string()),
});

export const documentAnalysisSchema = z.object({
  shape: z.string(),
  shape_label: z.string(),
  strategy: z.string(),
  needs_ocr: z.boolean(),
  encrypted: z.boolean(),
  empty: z.boolean(),
  partial: z.boolean(),
  language_hint: z.string(),
  script_hint: z.string(),
  page_count: z.number(),
  text_bytes: z.number(),
  table: tableAnalysisSchema,
  fields: z.array(fieldInferenceSchema),
  decisions: z.array(decisionSchema),
  confidence: confidenceSchema,
  evidence: z.array(z.string()),
  expected_actions: z.array(z.string()),
});

export const provenanceSchema = z.object({
  schema_version: z.string(),
  source_sha256: z.string(),
  source_bytes: z.number(),
  source_filename: z.string(),
  generated_at: z.string(),
  app_version: z.string(),
  commit: z.string(),
  strategy: z.string(),
  parameters: z.record(z.string()),
  tool_versions: z.record(z.string()),
  normalizations: z.array(z.string()),
  runtime_only_fields: z.array(z.string()),
  determinism_contract: z.string(),
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
  analysis: documentAnalysisSchema,
  confidence: z.record(confidenceSchema),
  anomalies: z.array(diagnosticSchema),
  provenance: provenanceSchema,
  processing_ms: z.number(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    what: z.string().optional(),
    why: z.string().optional(),
    now_what: z.string().optional(),
    severity: z.string().optional(),
    retryable: z.boolean().optional(),
  }),
});

export type DocumentResult = z.infer<typeof documentResultSchema>;
export type ExportArtifact = z.infer<typeof exportArtifactSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>["error"];
export type Confidence = z.infer<typeof confidenceSchema>;
export type Diagnostic = z.infer<typeof diagnosticSchema>;

export const healthSchema = z.object({
  status: z.string(),
  version: z.string(),
  commit: z.string(),
});

export type Health = z.infer<typeof healthSchema>;
