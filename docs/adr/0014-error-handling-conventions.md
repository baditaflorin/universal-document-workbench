# 0014 - Error Handling Conventions

## Status

Accepted

## Context

Upload parsing and external tool execution fail in many normal ways. Errors must be visible and machine-readable.

## Decision

Never panic for expected failures. Return JSON errors with `error.code` and `error.message`. Wrap Go errors with `%w`. Keep recover middleware for unexpected panics. Include non-fatal tool problems in the response `warnings` array.

`internal/utils` includes `HandleErrorOrLogWithMessages(err, errMsg, successMsg)` for the standing local convention.

## Consequences

The frontend can show clear failures while still displaying partial results when extraction succeeds but an optional export or entity pass fails.

## Alternatives Considered

Plain-text errors were rejected because the frontend needs structured handling.

