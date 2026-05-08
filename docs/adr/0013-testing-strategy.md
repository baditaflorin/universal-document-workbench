# 0013 - Testing Strategy

## Status

Accepted

## Context

Checks must run locally through Make and hooks because GitHub Actions are out of scope.

## Decision

Use Go unit tests, Vitest for frontend logic, and Playwright for a stub-backend smoke path. `make smoke` starts the Go API in stub mode, builds Pages output, serves `docs/` with a local Pages-style static server, and exercises the upload flow.

## Consequences

The smoke path does not require Java, Tesseract, Pandoc, or spaCy on the host. The production Dockerfile remains responsible for bundling those runtime tools.

## Alternatives Considered

Full Docker smoke on every pre-push was rejected because downloading language runtimes and models would exceed the target local feedback loop.

