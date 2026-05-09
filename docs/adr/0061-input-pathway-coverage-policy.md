# 0061 Input Pathway Coverage Policy

- Status: accepted
- Context: Real users arrive with files, pasted text, saved work, and sometimes URLs.
- Decision: Support local files, drag-drop, paste, clipboard read, sample intake, saved-state import, and constrained URL intake in the Pages frontend.
- Consequences: The app covers the common no-secret pathways without adding a runtime relay.
- Alternatives considered: Arbitrary URL proxying via backend; rejected for this phase because it changes the trust and deployment model.
