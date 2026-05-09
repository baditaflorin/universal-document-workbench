# 0068 Persistence Schema And Migration Policy

- Status: accepted
- Context: Saved sessions need a stable envelope.
- Decision: Version saved state with `schema_version: 2026-05-09.phase3` and validate imports/restores against a Zod schema before use.
- Consequences: Invalid or stale state is rejected cleanly instead of corrupting the session.
- Alternatives considered: Ad hoc JSON parsing; rejected because it would make restore failures opaque.
