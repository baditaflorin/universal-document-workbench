# 0011 - Logging Strategy

## Status

Accepted

## Context

Mode C needs production logs that work in Docker Compose and common log collectors.

## Decision

Use Go `slog` JSON logs to stdout. Log request failures, processing errors, startup, and shutdown events. The frontend emits no intentional production console logs.

## Consequences

Docker log rotation can retain bounded JSON logs, and operators can inspect failures with `docker compose logs`.

## Alternatives Considered

File logs were rejected because container stdout is simpler and easier to collect.

