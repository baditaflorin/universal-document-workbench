# Phase 2 Substance Plan

## Ranking Rule

Items are ranked by impact on the 10 real-data fixtures from `realdata-audit.md`, not by implementation novelty.

## Selected Substance Items

| Rank | Catalog Item | Real-Data Impact |
|---|---:|---|
| 1 | 6 Auto-detect structure | Stops PDFs, spreadsheets, CSVs, EPUBs, SEC filings, encrypted files, and empty text from all looking like generic text. |
| 2 | 16 Confidence scores on every inference | Prevents weak OCR/entity/table results from looking authoritative. |
| 3 | 32 Errors are actionable | Makes encrypted/corrupt/too-large/empty failures understandable. |
| 4 | 35 Deterministic outputs | Enables fixture testing and reproducible research/legal workflows. |
| 5 | 38 Output provenance | Makes exports auditable downstream. |
| 6 | 2 Encoding and format variants | Normalizes BOM, CRLF, NBSP, smart quotes, and invalid UTF-8 where the app directly reads text. |
| 7 | 13 Recognize common shapes | Adds form, scan, spreadsheet, CSV, SEC filing, ebook, HTML, plain text, encrypted, and empty shape categories. |
| 8 | 14 Domain-aware export | Markdown/export metadata carries source checksum, schema, confidence, warnings, and tool versions. |
| 9 | 24 Enumerate reachable states | Forces the UI/API to treat loading, empty, partial, low-confidence, error, and cancelled as intentional states. |
| 10 | 25 No stuck states | Every error or processing state has an exit: retry, choose another file, edit API URL, or cancel. |
| 11 | 26 Cancellation actually cancels | Frontend aborts the request and the Go context cancels subprocesses. |
| 12 | 27 Concurrency safety | Starting a new upload aborts the old one and avoids stale results. |
| 13 | 18 Surface anomalies | Empty-after-normalization, table-like text, non-English text, likely scan, huge file, and partial extraction are explicit. |
| 14 | 19 Explain decisions | Analysis includes evidence for each classification/confidence decision. |
| 15 | 7 Auto-classify fields | CSV/spreadsheet-like text infers columns and simple field types. |
| 16 | 9 Format normalization by default | Text normalization is applied consistently and recorded. |
| 17 | 12 Domain-aware validation | Missing currency/date ambiguity/unsupported language/empty content are warnings, not silent output. |
| 18 | 15 Domain conventions baked in | CSV delimiter sniffing, HTML semantic hints, SEC filing signals, EPUB/container hints, PDF scan/encryption hints. |
| 19 | 28 Profile real-data inputs | Fixture tests capture per-input elapsed time and size. |
| 20 | 31 Cache expensive things | Tool version checks are cached per process; deterministic analysis avoids repeated reads. |
| 21 | 33 Validate at boundaries | Upload validation happens before processing and returns localized error codes. |
| 22 | 34 Recoverable vs fatal explicit | API errors include severity and retryability. |
| 23 | 37 Debug overlay | `?debug=1` shows analysis internals and provenance. |
| 24 | 1 Fuzz parser | Fixture suite includes real and synthetic edge inputs; crashes fail tests. |
| 25 | 3 Huge inputs | Size budget is documented and tested through metadata/fixtures. |
| 26 | 4 Partial inputs | Truncated/broken inputs classify as partial/corrupt rather than crashing. |
| 27 | 5 Adversarial input | Weird CSV, Unicode, and malformed content covered by synthetic edge fixtures. |

## Implementation Order

1. Real-data fixtures and expected properties.
2. ADRs 0040-0049.
3. Backend analysis model: shape, confidence, anomalies, provenance, deterministic IDs.
4. Text normalization, CSV/field inference, language/script hints, scan/encryption/empty detection.
5. Actionable error taxonomy and boundary validation.
6. Deterministic exports with provenance.
7. Frontend schema/display/cancellation/debug/state coherence.
8. Fixture, fuzz, determinism, and performance tests.
9. Audit/postmortem/pass-rate update, version bump, publish.

## Completion Snapshot

Implemented in v0.2.0. The selected items are covered by fixture tests, ADRs 0040-0049, frontend analysis/debug UI, structured API errors, deterministic analyzer IDs, provenance-bearing exports, and the Phase 2 postmortem.
