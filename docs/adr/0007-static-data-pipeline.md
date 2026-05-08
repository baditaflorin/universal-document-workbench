# 0007 - Static Data Pipeline

## Status

Accepted

## Context

Mode B projects need a data-generation pipeline. This project is Mode C.

## Decision

No static data pipeline exists in v1. `make data` is a no-op that documents the Mode C choice.

## Consequences

There are no committed data artifacts or release-hosted data dumps. Runtime uploads are processed by the backend.

## Alternatives Considered

Pre-generated sample corpora were rejected as unrelated to the runtime upload workflow.

