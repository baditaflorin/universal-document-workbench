import { describe, expect, it } from "vitest";
import { buildWorkbenchSnapshot, trimResults, workbenchSnapshotSchema } from "./state";
import type { DocumentResult } from "./types";

function buildResult(id: string, filename: string): DocumentResult {
  return {
    id,
    filename,
    mime_type: "text/plain",
    size_bytes: 12,
    text: "hello",
    metadata: {},
    entities: [],
    people: [],
    dates: [],
    outputs: [],
    tool_versions: {},
    warnings: [],
    analysis: {
      shape: "plain_text",
      shape_label: "Plain text",
      strategy: "text_strategy",
      needs_ocr: false,
      encrypted: false,
      empty: false,
      partial: false,
      language_hint: "en",
      script_hint: "Latn",
      page_count: 1,
      text_bytes: 12,
      table: {
        detected: false,
        delimiter: "",
        rows: 0,
        columns: 0,
        confidence: { score: 0.9, label: "high" },
        header_names: [],
      },
      fields: [],
      decisions: [],
      confidence: { score: 0.9, label: "high" },
      evidence: [],
      expected_actions: [],
    },
    confidence: {
      document_shape: { score: 0.9, label: "high" },
    },
    anomalies: [],
    provenance: {
      schema_version: "1",
      source_sha256: "abc",
      source_bytes: 12,
      source_filename: filename,
      generated_at: "2026-05-09T00:00:00.000Z",
      app_version: "0.3.0",
      commit: "test",
      strategy: "text_strategy",
      parameters: {},
      tool_versions: {},
      normalizations: [],
      runtime_only_fields: [],
      determinism_contract: "same input same output",
    },
    processing_ms: 42,
  };
}

describe("workbench state", () => {
  it("builds a schema-valid snapshot", () => {
    const snapshot = buildWorkbenchSnapshot({
      activeTab: "Workspace",
      sourceMode: "paste",
      pastedText: "hello",
      sourceUrl: "",
      selectedResultId: "doc-1",
      settings: {
        apiBaseUrl: "http://localhost:8080",
        autosave: true,
        historyLimit: 6,
      },
      results: [buildResult("doc-1", "doc-1.txt")],
    });

    expect(workbenchSnapshotSchema.parse(snapshot).results).toHaveLength(1);
  });

  it("deduplicates results and keeps the newest ones first", () => {
    const trimmed = trimResults(
      [
        buildResult("doc-2", "doc-2.txt"),
        buildResult("doc-1", "doc-1-newer.txt"),
        buildResult("doc-1", "doc-1-older.txt"),
      ],
      2,
    );

    expect(trimmed.map((item) => item.id)).toEqual(["doc-2", "doc-1"]);
    expect(trimmed[1].filename).toBe("doc-1-newer.txt");
  });
});
