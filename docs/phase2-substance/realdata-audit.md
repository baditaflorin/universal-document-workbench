# Phase 2 Substance Real-Data Audit

## Audit Note

The audit below follows the current v1 implementation path: GitHub Pages upload UI, Go upload API, Apache Tika text/metadata extraction, Tesseract OCR fallback, spaCy entity detection, and Pandoc Markdown/DOCX/EPUB export. The local workspace cannot run the full production toolchain because the Phase 1 GHCR push was blocked by Docker/GHCR login, so "what v1 did" is based on implementation walkthrough plus the verified stub smoke path for UI behavior.

## Ten Real-World Inputs

| # | Input | Messiness | What v1 did | What it should have done | Why it failed or fell short | Failure type | Manual work pushed to user |
|---|---|---|---|---|---|---|---|
| 1 | IRS Form W-9 PDF, https://www.irs.gov/pub/irs-pdf/fw9.pdf | Clean fillable PDF form | Extracts flat text and metadata, then generic people/date entities. Exports prose-like Markdown/DOCX/EPUB. | Detect this as a tax form, preserve field labels/checkboxes, extract form fields, identify blank vs filled fields, and warn when no submitted values exist. | V1 treats all PDFs as text containers, not form documents. | Wrong shape, mildly silent | User must manually inspect whether form fields were captured. |
| 2 | Apple 2024 10-K iXBRL HTML, https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm | Long structured filing | Tika flattens text; entity pass runs across a very large body; exports lose iXBRL/table semantics. | Detect SEC filing, preserve section hierarchy, extract fiscal dates, registrant metadata, tables, and XBRL facts separately from narrative text. | No shape detection, no table/XBRL strategy, no long-document chunking. | Wrong-but-confident | User must find sections, tables, and financial facts manually. |
| 3 | Complete SEC submission text, https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/0000320193-24-000123.txt | Huge-ish mixed submission | Processes as one text blob if under limit; no progress/cancel; generic entities; exports can be very large base64 JSON payloads. | Detect multi-document SEC submission, split exhibits, provide per-document warnings and progress, avoid inline base64 for large artifacts. | V1 has one synchronous request/response and inline artifacts. | Slow or brittle | User waits without reliable progress and gets one undifferentiated output. |
| 4 | SEC Financial_Report.xlsx example, https://www.sec.gov/Archives/edgar/data/1626450/000156459020043288/Financial_Report.xlsx | Spreadsheet with sheets/tables | Tika extracts cell text; Markdown export is not a workbook/table representation; formulas/sheets are not surfaced. | Detect workbook, preserve sheet names, table ranges, numeric types, dates, and formulas; export structured Markdown tables and provenance. | No spreadsheet structure model or type inference. | Silent structure loss | User must reopen the spreadsheet to recover structure. |
| 5 | Project Gutenberg EPUB, https://www.gutenberg.org/ebooks/1342.epub.noimages | Clean ebook | Likely extracts text and metadata; exports EPUB again from flattened Markdown. | Preserve title/author/language/table of contents/chapters and avoid degrading EPUB to a generic regenerated ebook. | No ebook-aware metadata/chapter strategy. | Mildly silent | User must verify chapter boundaries and metadata. |
| 6 | Wikimedia scanned legal PDF, https://archive.org/download/cu31924016985420/cu31924016985420.pdf | Genuinely messy scanned legal book, 210 pages | Relies on Tika/Tesseract integration; no explicit OCR confidence, language, progress, cancellation, or page-level failures. If text is weak, exports still appear. | Detect scanned PDF, run page-aware OCR, report OCR confidence/page failures, allow cancellation, and mark low-confidence exports. | OCR is not modeled as a first-class pipeline with quality signals. | Wrong-but-confident risk | User must spot OCR garbage manually. |
| 7 | Arabic legal/financial PDF, https://hz.turathalanbiaa.com/public/735.pdf | RTL/non-English/scanned-looking | English spaCy model is used; entities/dates are likely absent or wrong; UI/export do not say language support is low. | Detect language/script, preserve RTL text order, skip or switch NLP model with explicit confidence, and warn when entity extraction is unsupported. | No language detection, no RTL policy, English-only NLP. | Wrong-but-confident | User must know English NLP is inappropriate. |
| 8 | Password-protected PDF sample, https://www.sjsu.edu/cob/docs/Sample_password_protected_file.pdf | Broken/requires password | Tika likely fails; API returns a generic processing failure; no password recovery path or domain wording. | Say "This PDF is encrypted and needs a password" and preserve the upload state so the user can retry. | Error taxonomy does not distinguish encrypted, corrupt, unsupported, or tool-missing cases. | Obvious but not actionable | User must infer what password/encryption means from a generic error. |
| 9 | NYC 311/OpenData-scale CSV export, source context https://portal.311.nyc.gov/article/?kanumber=KA-02893 | Huge tabular CSV | CSV is treated as a document, not a dataset; large exports may hit 50 MB limit; no delimiter/schema/type inference. | Detect CSV/table, sniff delimiter/encoding, infer columns and types, stream or reject with a size-specific next step. | No tabular strategy and no streaming large-input path. | Obvious for huge files, silent for smaller CSVs | User must know that a "document workbench" cannot reason about CSV tables yet. |
| 10 | Empty or whitespace-only `.txt` from a failed export | Edge case/empty | Non-zero whitespace file passes upload and produces an empty-looking result with downloadable exports. | Detect "empty after normalization," stop export, explain that no content was found, and offer retry/check-source guidance. | Empty content is checked by byte size only, not normalized text content. | Wrong-but-confident | User must open the export to discover it is empty. |

## Top 5 Logic Gaps

1. No document-shape triage. V1 does not classify inputs as scanned PDF, form, spreadsheet, CSV, SEC filing, ebook, encrypted PDF, empty text, or corrupt upload before choosing a strategy.
2. No confidence model. Text extraction, OCR, entity detection, language handling, and exports have no confidence score, so weak output looks as official as good output.
3. No domain-aware structure preservation. Tables, form fields, workbook sheets, SEC filing sections, EPUB chapters, and scanned-page boundaries collapse into flat text.
4. Failure taxonomy is too shallow. Encrypted, corrupt, too large, OCR unavailable, unsupported language, empty-after-normalization, and partial extraction are not distinct user-facing states.
5. Outputs are not reproducible enough. Results include random IDs/timing, large artifacts are inline base64, exports lack source checksum/schema/parameters/confidence, and DOCX/EPUB generation may not be byte-stable.

## Top 3 Intuition Failures

1. A blank or low-quality extraction can still look like a completed successful result with export buttons.
2. A user can upload a table-like file and reasonably expect tables, but V1 returns prose-like text.
3. The Pages app asks for an API URL and shows backend health, but if the backend is offline or wrong, it does not explain the deployment/runtime dependency in document-workbench terms.

## Top 3 "Feels Stupid" Moments

1. The user has to know whether a PDF is scanned, encrypted, form-based, or born-digital; the app should infer that.
2. The user has to manually decide whether entity extraction is trustworthy, especially for non-English or OCR-heavy documents.
3. The user has to inspect exports to discover missing tables, empty text, broken OCR, or lost metadata.

## What "Smart" Means For This Product

1. On upload, the app classifies the document shape with confidence before extraction: form, scan, table/spreadsheet, filing/report, ebook, plain text, encrypted/corrupt, or empty.
2. The app chooses the right extraction strategy automatically and reports quality: text coverage, OCR confidence, language/script, page failures, table preservation, and metadata completeness.
3. The first result is useful without configuration: readable text, preserved structure where possible, normalized dates/people/orgs, and clear warnings when confidence is low.
4. Exports carry provenance and honesty: source checksum, app/tool versions, schema version, extraction parameters, confidence, warnings, and deterministic identifiers.
5. Failures say what happened, why it happened in document terms, and what the user can do next.

## Phase 2 Substance Success Metrics

1. Real-data pass rate: at least 7 of the 10 fixtures complete the primary flow with no manual intervention beyond selecting the file.
2. No crashes: all 10 real fixtures plus 5 synthetic edge fixtures return either a useful result or an actionable failure.
3. No silent wrongness: 100% of low-confidence/empty/partial outputs are visibly marked in UI and exports.
4. Determinism: canonical JSON and Markdown outputs are byte-identical on 10/10 fixtures across repeated runs, excluding explicitly documented runtime-only fields.
5. Performance honesty: every operation over 300 ms shows progress; every operation over 5 s is cancellable; huge inputs never freeze the UI thread.
6. Large-input policy: documented and tested at 1x, 5x, and 10x the chosen size budget, with clear reject/stream behavior.
7. Error quality: every user-facing error passes the what/why/now-what rule.

## Out Of Scope For Phase 2 Substance

- No new output formats.
- No auth, user accounts, teams, or cloud storage.
- No visual polish, dark mode, command palette, OG images, or marketing work.
- No architecture mode change; the project remains Mode C.
- No LLM summarization, question answering, or legal/research advice.
- No custom-trained NLP models.
- No server-side persistence beyond temporary processing state.
- No collaborative editing or cross-device sync.

