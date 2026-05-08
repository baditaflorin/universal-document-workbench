# 0004 - API Contract

## Status

Accepted

## Context

Mode C needs a stable REST/JSON contract between GitHub Pages and the Docker backend.

## Decision

Use a small REST API documented in `api/openapi.yaml`:

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`
- `GET /api/v1/version`
- `POST /api/v1/documents`

The document endpoint accepts `multipart/form-data` with a single `file` part and returns extracted text, metadata, entities, detected people/dates, tool versions, warnings, processing time, and base64 encoded Markdown/DOCX/EPUB artifacts.

## Consequences

The frontend can be hosted anywhere and pointed at any compatible backend URL. Large files are bounded by `APP_MAX_UPLOAD_BYTES`.

## Alternatives Considered

GraphQL was rejected as unnecessary. Streaming downloads were deferred to keep v1 simple.

