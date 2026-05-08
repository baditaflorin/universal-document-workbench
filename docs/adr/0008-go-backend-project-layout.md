# 0008 - Go Backend Project Layout

## Status

Accepted

## Context

The backend needs clear boundaries and room for future commands without hiding logic in one package.

## Decision

Follow the standard Go project layout:

- `cmd/server/` for the runtime API.
- `internal/config/` for environment loading.
- `internal/httpapi/` for routing, handlers, metrics, and API errors.
- `internal/processor/` for document processing orchestration.
- `internal/utils/` for shared conventions.
- `pkg/version/` for public build metadata types.
- `api/` for OpenAPI.
- `test/` for integration tests.

## Consequences

Most behavior remains in internal packages and can be tested without invoking the production binary.

## Alternatives Considered

A flat package was rejected because upload handling, command execution, conversion, and HTTP concerns would become tangled quickly.

