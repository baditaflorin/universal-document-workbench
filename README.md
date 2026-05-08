# Universal Document Workbench

Live site: https://baditaflorin.github.io/universal-document-workbench/

Repository: https://github.com/baditaflorin/universal-document-workbench

Support development: https://www.paypal.com/paypalme/florinbadita

Drop documents into a static GitHub Pages UI and process them through a Docker backend that extracts text and metadata, OCRs scans, detects entities, and exports Markdown, DOCX, and EPUB.

## Quickstart

```sh
make install-hooks
make dev
make test
make build
make smoke
```

## Architecture

The frontend is hosted on GitHub Pages. The runtime document pipeline is a Dockerized Go API that orchestrates Apache Tika, Tesseract, Pandoc, and spaCy.

See `docs/architecture.md` and `docs/adr/` for the decision record.

## Status

The v1 target is a complete local/self-hosted workbench. GitHub Pages is live from the first scaffold commit, while the Docker backend is deployed separately.

