# 0040 - Real-Data Audit Findings and Substance Success Metrics

## Status

Accepted

## Context

The Phase 2 audit found that v1 handled the happy path but flattened forms, spreadsheets, SEC filings, EPUBs, scans, and non-English documents into generic text. It also allowed weak or empty output to look successful.

## Decision

Use the 10 real-data fixtures as the Phase 2 grading rubric. Success means at least 7 of 10 complete the primary flow with no manual intervention, every low-confidence result is marked, and canonical JSON/Markdown output is deterministic apart from documented runtime-only fields.

## Consequences

The fixture suite becomes a release gate. New extraction behavior must improve or preserve fixture outcomes.

## Alternatives Considered

Continuing with curated smoke input was rejected because it does not exercise the product's real workflow.

