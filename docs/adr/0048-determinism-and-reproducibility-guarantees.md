# 0048 - Determinism and Reproducibility Guarantees

## Status

Accepted

## Context

Research/legal workflows need rerunnable output.

## Decision

Use SHA-256 source checksums for stable IDs. Sort map keys and entity lists. Keep canonical JSON/Markdown deterministic apart from explicitly documented runtime fields: `processing_ms` and `generated_at`. Exports include source checksum, schema version, app version, commit, tool versions, warnings, confidence, and extraction strategy.

## Consequences

Fixture tests can compare canonical output and exports can be audited.

## Alternatives Considered

Random request IDs were rejected for user-visible document identity.

