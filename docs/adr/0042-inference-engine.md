# 0042 - Inference Engine

## Status

Accepted

## Context

Users should not have to tell the app whether an upload is a scan, form, filing, spreadsheet, ebook, CSV, encrypted PDF, or empty text.

## Decision

Add a deterministic analysis layer that infers document shape, language/script hints, table likelihood, field types, OCR need, encryption/corruption hints, and extraction strategy. Each inference carries confidence and human-readable evidence.

## Consequences

The same upload endpoint returns a useful first guess and enough explanation for users to correct or distrust weak output.

## Alternatives Considered

Delegating all inference to frontend heuristics was rejected because backend fixtures and exports need the same analysis.

