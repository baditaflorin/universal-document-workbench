# 0049 - Inspectability and Debug Surface

## Status

Accepted

## Context

Power users and maintainers need to understand why the app classified or trusted an input.

## Decision

Support `?debug=1` in the frontend. Debug mode reveals analysis evidence, provenance, tool versions, anomalies, warnings, and raw confidence details. Debug mode does not send extra data to the server.

## Consequences

The main UI remains focused while support/debugging has a reliable internal view.

## Alternatives Considered

Always showing internals was rejected because it would make the workbench noisier for normal users.

