# Phase 3 Findings

Top 5 usability gaps at the start of Phase 3:

1. Users could only upload one local file at a time.
2. Reloading the page discarded the actual document result and all session context.
3. There was no clean way to bring text, HTML, or saved app state into the workbench.
4. There was no machine-readable way to take results back out besides the generated artifacts.
5. The main result area was empty until a happy-path upload succeeded, which made the app feel inert.

Top 5 half-baked features and decisions:

1. Single-file-only intake: finished.
2. Empty-state-only main panel: finished as a real Workspace view.
3. Debug surface: kept behind `?debug=1`.
4. URL intake: finished with explicit browser-limit messaging.
5. Share-by-URL: hidden by omission and documented as out of scope for this mode.

Top 5 codebase pain points:

1. God component in the frontend.
2. Missing persisted workspace schema.
3. No dedicated state round-trip tests.
4. Output actions spread across tabs with no shared helpers.
5. Docs overstated how ready the UI was for stranger workflows.

Project-specific definition of “fully usable”:

1. A stranger can upload, paste, or load a sample document and get a useful result without reading the code.
2. A stranger can preserve work across reloads or export it as a state file.
3. A stranger can take results out as text, artifact downloads, or JSON.
4. Every visible setting and button does exactly what its label promises.
5. When a browser/runtime limit blocks a path, the app says why and offers the next step.

Phase 3 success metrics:

- All primary intake modes except folder-import are green or honestly constrained.
- All visible workbench settings are functional.
- Session restore and state file import/export pass locally.
- Frontend typecheck, lint, tests, build, and smoke all pass after the changes.

Out of scope:

- New extraction engines or new backend pipeline features.
- Visual polish work.
- Arbitrary public-URL proxying via a new runtime service.
