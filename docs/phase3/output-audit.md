# Phase 3 Output Audit

Date: 2026-05-09

| Output path | Baseline | Phase 3 | Notes |
| --- | --- | --- | --- |
| Markdown / DOCX / EPUB download | green | green | Existing export buttons remain. |
| TXT download | green | green | Still available from the Text tab. |
| Copy extracted text | red | green | Added on Workspace and Text surfaces. |
| Copy result JSON | red | green | Useful for automation and debugging. |
| Download result JSON | red | green | Per-result export now available from Exports. |
| Download workspace state | red | green | Full session snapshot for restore and handoff. |
| Import workspace state | red | green | Completes the round trip for saved work. |
| Share link | red | yellow | Not added; large document payloads are a poor fit for URL state in Pages mode. |
| Print-friendly report | red | red | Explicitly deferred; not core to the ingestion/export loop. |
| Screenshot/export image | red | red | Deferred; outside the current document-workbench contract. |
| API-ready JSON | yellow | green | Result JSON is now copyable/downloadable in stable shape. |

Summary:

- Before Phase 3, the only reliable exit was downloading pipeline artifacts.
- After Phase 3, users can take either the human-readable outputs or the machine-readable state/result JSON without losing context.
