# 0005 - Client-Side Storage Strategy

## Status

Accepted

## Context

The frontend needs minimal persistence but should not store private document contents by default.

## Decision

Use `localStorage` only for the backend API URL. Do not persist uploaded files, extracted text, metadata, entities, or exports in v1.

## Consequences

The app avoids retaining sensitive documents in the browser after refresh. Cross-device sync is out of scope.

## Alternatives Considered

IndexedDB and OPFS were rejected for v1 because persistent document workspaces would increase privacy and deletion complexity.

