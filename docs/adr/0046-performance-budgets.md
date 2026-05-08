# 0046 - Performance Budgets

## Status

Accepted

## Context

Large documents can take seconds or minutes. The UI must be honest and tests need performance measurements.

## Decision

Budget:

- Classification/analysis: under 300 ms for fixtures under 10 MB.
- Stub fixture processing: under 1 second median.
- UI: show processing state immediately and elapsed progress after 300 ms.
- Operations beyond 5 seconds remain cancellable.
- Upload limit defaults to 50 MB; larger inputs are rejected with a size-specific error.

## Consequences

The fixture suite records elapsed time and the UI avoids appearing frozen.

## Alternatives Considered

Streaming progress endpoints were deferred because Phase 2 cannot change the architecture or add new workflow surface.

