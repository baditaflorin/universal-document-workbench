# 0064 Dry Consolidation Map

- Status: accepted
- Context: Rendering helpers, result summaries, and session serialization were entangled in one component.
- Decision: Move shared session logic into `state.ts`, shared download/view helpers into `view.ts`, and presentational panels into `WorkbenchPanels.tsx`.
- Consequences: The orchestration component can focus on workflow state and side effects.
- Alternatives considered: A larger reducer-first rewrite; rejected as more churn than needed for the current codebase size.
