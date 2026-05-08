# 0012 - Metrics and Observability

## Status

Accepted

## Context

The backend should expose scrape-ready metrics while the static frontend should not collect analytics by default.

## Decision

Expose Prometheus metrics at `/metrics`:

- HTTP request count.
- HTTP request duration.
- Documents processed total.
- Upload byte histogram.
- Document processing duration histogram.
- Go runtime and process metrics.

Nginx blocks public `/metrics` access. No frontend analytics are included.

## Consequences

Operators can enable the Prometheus Compose profile without changing the app. Public users are not tracked by the static frontend.

## Alternatives Considered

Plausible and custom beacons were rejected for v1 because usage analytics are not required.

