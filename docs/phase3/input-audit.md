# Phase 3 Input Audit

Date: 2026-05-09

Legend: `green` = works end to end, `yellow` = constrained but honest, `red` = not present.

| Input path | Baseline | Phase 3 | Notes |
| --- | --- | --- | --- |
| File picker | green | green | Multiple files now queue and process sequentially. |
| Drag and drop | green | green | Batch drop supported through the same queue. |
| Paste text | red | green | Paste area creates a virtual file and sends it through the backend. |
| Paste HTML | red | green | HTML is inferred and sent as `text/html`. |
| Clipboard read | red | green | Permission-aware browser read with clear fallback. |
| URL input | red | yellow | Works when the remote host allows browser fetches; otherwise the UI explains the CORS limitation and next step. |
| Mobile picker | yellow | green | Same file input works on mobile browsers; documented rather than special-cased. |
| Multi-file batch | red | green | Queue stats, partial success, and per-run notices added. |
| Folder input | red | red | Intentionally not added in Phase 3; browser support is uneven and it would widen the UI without improving core document processing. |
| Demo/sample | red | green | Built-in sample is now a first-class intake mode. |
| Imported state | red | green | State JSON can restore saved results, settings, tab, and drafts. |
| Restored autosave | red | green | Last session restores when autosave is enabled. |
| Deep links | red | yellow | `?debug=1` remains supported; shareable document-state URLs stay out of scope for this mode. |

Summary:

- Top user blocker before Phase 3 was the single-file-only upload funnel.
- The only intentionally non-green rows are the ones blocked by browser/runtime limits that cannot be solved honestly in a static Pages frontend without adding a server-side relay.
