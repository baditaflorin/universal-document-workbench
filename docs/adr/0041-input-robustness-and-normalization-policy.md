# 0041 - Input Robustness and Normalization Policy

## Status

Accepted

## Context

Real documents contain BOMs, CRLF line endings, NBSPs, smart quotes, malformed bytes, large payloads, scans, encrypted PDFs, and partial files.

## Decision

Analyze bytes before extraction where possible. Normalize direct text output by removing UTF-8 BOM, replacing CRLF/CR with LF, mapping NBSP to space, trimming zero-width characters, and replacing invalid UTF-8. Preserve paragraph breaks while collapsing excessive horizontal whitespace. Record every normalization action in provenance.

## Consequences

Text-like inputs become predictable and fixture-testable. Binary formats still rely on Tika/Pandoc for deep parsing, but the app records the shape/quality hints it can infer safely.

## Alternatives Considered

Leaving all normalization to Tika was rejected because the API directly handles text, CSV, and stub/test paths.

