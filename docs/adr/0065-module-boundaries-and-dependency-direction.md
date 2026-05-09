# 0065 Module Boundaries And Dependency Direction

- Status: accepted
- Context: The workbench frontend needed clearer boundaries to stay maintainable.
- Decision: Keep `DocumentWorkbench.tsx` as orchestration, `WorkbenchPanels.tsx` as presentational UI, `state.ts` as schema/storage helpers, and `view.ts` as non-React result helpers.
- Consequences: Dependencies flow from orchestration to helpers, not the other way around.
- Alternatives considered: Moving everything to a single reducer module; rejected because it would still blend presentation with persistence.
