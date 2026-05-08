# 0002 - Architecture Overview and Module Boundaries

## Status

Accepted

## Context

The workbench needs a static public UI and a runtime document processing pipeline. The processing toolchain crosses Java, native OCR, Haskell-built CLI tools, and Python NLP packages.

## Decision

Split the system into three boundaries:

- `frontend/`: Vite React TypeScript app published to GitHub Pages.
- `cmd/`, `internal/`, `pkg/`: Go API server and processing orchestration.
- `deploy/`: production Docker Compose and nginx assets.

The Go API owns uploads, timeouts, temp files, tool execution, conversion, and JSON responses. The frontend owns file selection, API URL configuration, result rendering, and downloads.

## Consequences

The UI can be published independently from backend deployment. The backend remains API-only and never serves the Pages frontend.

## Alternatives Considered

A single server-rendered application was rejected because the Pages frontend is a non-negotiable deliverable.

