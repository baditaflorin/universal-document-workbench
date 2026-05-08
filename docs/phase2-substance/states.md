# Phase 2 State Taxonomy

## Frontend States

- `idle-empty`: no file selected.
- `backend-checking`: health query in progress.
- `backend-ready`: health query succeeded.
- `backend-offline`: health query failed; user can edit API URL or retry.
- `file-selected`: file chosen, no processing request running.
- `processing-starting`: request created but no response yet.
- `processing-active`: request is in flight and cancellable.
- `processing-cancelled`: user aborted the request; previous result remains intact if present.
- `loaded-useful`: result has text and medium/high confidence.
- `loaded-low-confidence`: result exists but one or more core confidence scores are low.
- `loaded-partial`: result has warnings/anomalies that affect completeness.
- `loaded-empty`: result is structurally valid but contains no usable extracted text.
- `error-recoverable`: user can retry, choose another file, or edit API URL.
- `error-fatal`: server returned a non-retryable document failure; user can choose another file.

## Backend States

- `accepted`: upload passed boundary validation.
- `rejected-empty`: upload has no bytes.
- `rejected-too-large`: upload exceeds configured limit.
- `rejected-invalid-name`: filename cannot be safely represented.
- `analyzed`: source checksum, media hints, shape, and confidence were computed.
- `extracting`: Tika/text extraction is running.
- `ocr-needed`: scan/image detected and OCR is useful.
- `ocr-running`: Tesseract is running.
- `nlp-running`: entity detection is running.
- `exporting`: Markdown/DOCX/EPUB artifacts are being generated.
- `completed-useful`: usable result.
- `completed-partial`: result plus warnings/anomalies.
- `completed-empty`: extraction completed but normalized text is empty.
- `cancelled`: request context was cancelled and subprocesses are killed.
- `failed-recoverable`: encrypted/unsupported/temporary dependency issue.
- `failed-fatal`: corrupt input or unexpected processing error.

