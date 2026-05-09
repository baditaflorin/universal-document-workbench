# 0069 Type-Safety Policy At Boundaries

- Status: accepted
- Context: Browser session restore and state import are new external boundaries.
- Decision: Validate saved-state JSON at the import/restore boundary and keep frontend app code free of `any` and `@ts-ignore`.
- Consequences: Phase 3 adds workflow breadth without loosening type guarantees.
- Alternatives considered: Trusting imported JSON; rejected as too risky for a persistence feature.
