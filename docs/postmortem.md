# Postmortem

## What Was Built

Universal Document Workbench now has:

- A public GitHub Pages React app at https://baditaflorin.github.io/universal-document-workbench/.
- Links to https://github.com/baditaflorin/universal-document-workbench and https://www.paypal.com/paypalme/florinbadita in the live UI.
- Visible frontend/backend version and commit metadata.
- A Go REST API with health, readiness, metrics, version, and document upload endpoints.
- A Docker backend that bundles Apache Tika, Tesseract, Pandoc, and spaCy.
- Markdown, DOCX, and EPUB export artifacts in the API response.
- ADRs, OpenAPI, deployment docs, runbook, privacy notes, local hooks, Make targets, unit tests, and Playwright smoke tests.

## Was Mode C Correct?

Yes. Mode A would not have been credible for v1 because the required toolchain depends on JVM/native/Python/Haskell runtime components and large NLP/OCR assets. Mode B also did not fit because users upload arbitrary private documents at runtime. Mode C was the correct choice.

## What Worked

- GitHub Pages from `main` `/docs` was simple and worked from the first commit.
- Stub backend mode made local smoke tests fast without requiring Java, Tesseract, Pandoc, or spaCy on the host.
- The Go API boundary stayed small: upload, process, return structured JSON.
- The frontend stayed under the initial JavaScript budget at about 89 KB gzipped.

## What Did Not Work

- The local machine had a global CGO linker flag pointing at ONNX Runtime, so Go tests needed `CGO_ENABLED=0` in Make targets.
- The first npm install ran out of disk because the npm cache was already several gigabytes.
- The production Docker image cannot realistically meet a sub-50 MB target while bundling Java, Tika, Tesseract, Pandoc, Python, spaCy, and a model.

## Surprises

- GitHub Pages and project documentation can coexist in `docs/` cleanly when Vite uses `emptyOutDir: false` and the build script cleans only `docs/assets`.
- Some npm packages include Go files under `node_modules`, so `frontend/go.mod` was added to keep root `go test ./...` from descending into frontend dependencies.

## Accepted Tech Debt

- DOCX and EPUB artifacts are returned as base64 in the JSON response. Streaming artifact downloads would be better for large documents.
- OCR fallback is direct for images; scanned PDFs rely on Tika/Tesseract integration rather than a separate PDF rasterization pass.
- The nginx config includes placeholder TLS certificate paths that operators must replace during deployment.
- Full Docker build/push was scaffolded but not run in this workspace because the image is intentionally large.

## Next Three Improvements

1. Add async job processing with artifact download URLs for large files.
2. Add optional OCR language selection and per-upload processing options.
3. Add sandbox hardening for document processing, such as stricter seccomp profiles and per-request CPU/memory limits.

## Time Spent vs Estimate

Estimated v1 scaffold: 2 to 3 hours.

Actual implementation pass: about 1.5 hours in this workspace, with most time spent on dependency installation, local verification, and Pages-ready packaging.

