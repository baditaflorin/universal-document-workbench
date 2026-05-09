# 0067 State-Management Convention

- Status: accepted
- Context: The workbench now has richer session state than a single selected file.
- Decision: Keep local React state for transient browser objects such as `File[]`, and persist only schema-validated serializable session state to local storage and export JSON.
- Consequences: The app restores meaningful context without pretending that browser `File` objects survive reloads.
- Alternatives considered: Persisting everything in IndexedDB; rejected for this phase to keep the Pages frontend lean.
