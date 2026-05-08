# 0044 - Confidence Model

## Status

Accepted

## Context

Wrong-but-confident output is the worst Phase 2 failure mode.

## Decision

Represent confidence as a number from `0.0` to `1.0` plus a label: `low`, `medium`, or `high`. Attach confidence to document shape, text extraction, metadata, OCR, language, entity detection, and exports. Exports inherit the lowest relevant confidence.

## Consequences

Low-confidence outputs are visible in UI and included in export provenance.

## Alternatives Considered

A boolean "has warnings" model was rejected because it cannot distinguish minor caveats from untrustworthy output.

