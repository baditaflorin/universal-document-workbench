# 0043 - Domain Vocabulary and UI Language Conventions

## Status

Accepted

## Context

V1 errors and labels exposed implementation concepts more than document-workbench concepts.

## Decision

Use document-domain language: "scanned PDF", "encrypted PDF", "spreadsheet", "form fields", "table-like text", "low OCR confidence", "partial extraction", "unsupported language". Avoid raw parser/tool wording unless shown in debug/provenance.

## Consequences

The UI and API errors become more actionable for researchers, legal teams, and journalists.

## Alternatives Considered

Returning only low-level tool errors was rejected because it forces users to diagnose parser internals.

