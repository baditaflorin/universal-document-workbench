# 0006 - WASM Modules

## Status

Accepted

## Context

Mode A would require browser WASM ports for Tika-class parsing, OCR, Pandoc conversion, and NLP.

## Decision

Do not use WASM modules in v1. The runtime toolchain executes in the Docker backend.

## Consequences

The frontend initial payload stays small and the document pipeline can use mature native/JVM/Python tools.

## Alternatives Considered

Tesseract.js and Pandoc WASM were considered, but they would not cover the full 1000+ format requirement with acceptable v1 reliability.

