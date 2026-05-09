# Phase 2 Substance Postmortem

Date: 2026-05-09

## Real-Data Pass Rate

Before: 3/10 fixtures had a useful primary flow without hidden caveats.

After: 10/10 fixtures classify into the expected document shape with required evidence, warnings, and confidence. The full text/OCR quality still depends on the external toolchain, but the app no longer treats messy inputs as generic successful text.

| Fixture | Before | After |
|---|---:|---:|
| IRS W-9 PDF | Fail | Pass |
| Apple 10-K HTML | Partial | Pass |
| Apple SEC submission | Partial | Pass |
| SEC workbook | Fail | Pass |
| Gutenberg EPUB | Partial | Pass |
| Scanned legal PDF | Fail | Pass |
| Arabic PDF | Fail | Pass |
| SJSU PDF sample | Partial | Pass |
| NYC 311 CSV | Fail | Pass |
| Empty export | Fail | Pass |

## Top Logic Gaps Closed

1. Document-shape triage: added deterministic detection for forms, scanned PDFs, non-English PDFs, spreadsheets, EPUBs, SEC filings/submissions, CSVs, empty text, encrypted markers, and partial PDFs.
2. Confidence model: every major inference now carries low/medium/high plus score, and the UI/export surface it.
3. Structure awareness: table delimiter/header/type inference and domain warnings make structure loss explicit.
4. Error taxonomy: processor errors now include what, why, now what, severity, and retryability.
5. Reproducibility: stable source-hash IDs, source SHA-256, schema version, parameters, tool versions, normalizations, and runtime-only fields are recorded.

## Smart Behaviors Delivered

- On upload, the app shows a first guess for document shape, confidence, strategy, evidence, warnings, and next steps.
- Empty, unsupported-language, OCR-heavy, form, table, and multi-document cases are no longer silent successes.
- CSV/table inputs infer delimiter, sampled rows/columns, headers, and simple field types.
- Exports include deterministic Markdown front matter with schema, source hash, shape, confidence, strategy, and warnings.
- `?debug=1` exposes internal result JSON without embedding export base64 bodies.

## Determinism

Analyzer determinism: pass on 10/10 real fixtures. The test suite compares shape analysis, warnings, anomalies, stable ID, and SHA across repeated runs.

Runtime-only fields are documented in provenance: `processing_ms` and `provenance.generated_at`.

## Performance

Analyzer benchmark command:

`CGO_ENABLED=0 go test ./internal/processor -bench BenchmarkAnalyzeRealDataFixtures -run '^$' -benchtime=1x`

Median: 12.95 ms. Worst: 46.82 ms. Details: `docs/perf/phase2-realdata.md`.

The main fix was skipping full text normalization for binary PDF/ZIP containers and sampling large text at 2 MB for analysis.

## Surprises

- A supposedly password-protected public sample was not encrypted; the encrypted path is now covered by a synthetic PDF marker fixture instead.
- Raw PDF bytes looked like RTL text when treated as Unicode. Language detection now avoids that false confidence.
- The biggest early performance cost was not OCR or NLP; it was normalizing binary bytes before shape detection.

## Still Open

1. Page-level OCR confidence and page failure reporting for long scanned PDFs.
2. True PDF form field/value extraction instead of form-shape warning only.
3. Structured workbook/table exports instead of text-oriented Markdown/DOCX/EPUB.
4. SEC filing section/fact extraction beyond shape detection and warnings.
5. Large artifact delivery outside inline base64 for very large exports.

## Honest Take

The app feels materially smarter than v1 because it now makes a domain-specific first guess and admits uncertainty. It is not yet a complete research/legal production engine: scanned PDFs, forms, SEC facts, and spreadsheets still need deeper structured extraction. But it no longer feels like a generic file-to-text toy on messy inputs; it behaves like an honest intake workbench that knows what kind of trouble it is looking at.
