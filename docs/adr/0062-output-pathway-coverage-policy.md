# 0062 Output Pathway Coverage Policy

- Status: accepted
- Context: Generated artifacts alone are not enough for support, automation, or resuming work.
- Decision: Expose text copy, result JSON copy/download, artifact downloads, and full workspace state export/import.
- Consequences: Users can hand results to humans or machines without losing provenance.
- Alternatives considered: Only supporting artifact downloads; rejected as too brittle for debugging and workflow recovery.
