# 0001 - Deployment Mode

## Status

Accepted

## Context

Universal Document Workbench must accept arbitrary files at runtime, parse 1000+ formats, OCR scanned documents, run NLP entity detection, and convert output to Markdown, DOCX, and EPUB. The named production components are Apache Tika, Tesseract, Pandoc, and spaCy. These runtimes require JVM, native OCR libraries, Haskell-built conversion binaries, Python packages, and model assets.

GitHub Pages is the preferred public surface. The first question is whether all runtime processing can happen statically, in the browser, or from pre-built artifacts.

## Decision

Use Mode C: GitHub Pages frontend + Docker backend.

The frontend is static and served from GitHub Pages. The backend is a Dockerized Go API that orchestrates Apache Tika, Tesseract, Pandoc, and spaCy for runtime uploads.

## Consequences

- The public UI remains cheap, cacheable, and easy to share.
- Users can self-host the backend where they can control document privacy and resource limits.
- Runtime document processing, OCR, and conversion can use mature command-line tools instead of incomplete browser ports.
- The project must maintain CORS, Docker, nginx, health checks, metrics, and server deployment documentation.
- The Docker image will be larger than a minimal Go image because it intentionally bundles Java, Tesseract, Pandoc, Python, spaCy, and language/model assets.

## Alternatives Considered

- Mode A, pure GitHub Pages: rejected because full Tika/Pandoc/spaCy/Tesseract capability is not practical in browser WASM for arbitrary files in v1.
- Mode B, pre-built data: rejected because users upload arbitrary private documents at runtime, so the core data cannot be pre-generated.

