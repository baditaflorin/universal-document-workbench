# 0017 - Dependency Policy

## Status

Accepted

## Context

The project orchestrates security-sensitive file parsers. Custom implementations would increase risk.

## Decision

Use battle-tested libraries and pinned runtime tools:

- Apache Tika 3.3.0 for parsing.
- Tesseract 5 from Debian packages for OCR.
- Pandoc from Debian packages for conversion.
- spaCy 3.8.7 with `en_core_web_sm` for NLP.
- Go chi, cors, validator, envconfig, viper, Prometheus client.
- React, Vite, zod, TanStack Query, Tailwind, Vitest, Playwright.

## Consequences

The Docker image is larger than a minimal Go service but the pipeline is built on mature tools with clear upgrade paths.

## Alternatives Considered

Hand-written parsers, OCR, conversion, and NLP were rejected.

