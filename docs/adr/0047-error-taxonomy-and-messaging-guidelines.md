# 0047 - Error Taxonomy and Messaging Guidelines

## Status

Accepted

## Context

Generic "processing failed" does not help users recover.

## Decision

Every API error includes `code`, `message`, `what`, `why`, `now_what`, `severity`, and `retryable`. Error messages follow the what/why/now-what rule. Boundary validation handles empty, too-large, invalid filename, encrypted/corrupt, cancelled, unsupported, dependency unavailable, and processing failure categories.

## Consequences

Frontend can display actionable failures without parsing arbitrary strings.

## Alternatives Considered

Keeping the Phase 1 error shape was rejected because it cannot support graceful recovery.

