# 0045 - State Taxonomy and State Machine

## Status

Accepted

## Context

Phase 2 requires no stuck states, intentional empty/partial/low-confidence states, and real cancellation.

## Decision

Use the state taxonomy in `docs/phase2-substance/states.md`. Frontend processing is cancellable via `AbortController`; starting a new request aborts the previous request. Backend command execution already uses request context and must return cancellation as an actionable error.

## Consequences

Users can always retry, cancel, choose another file, or edit the API URL.

## Alternatives Considered

Leaving cancellation as browser tab navigation was rejected because long OCR/large-file operations need an explicit escape.

