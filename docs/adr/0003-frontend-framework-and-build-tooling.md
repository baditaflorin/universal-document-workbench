# 0003 - Frontend Framework and Build Tooling

## Status

Accepted

## Context

The UI needs strict TypeScript, GitHub Pages configuration from day one, a small asset budget, accessible controls, and fast local smoke tests.

## Decision

Use React 19, Vite, TypeScript strict mode, Tailwind CSS, zod, TanStack Query, lucide-react, Vitest, and Playwright.

## Consequences

Vite builds directly into `docs/` with hashed assets and a `404.html` SPA fallback. The app can fetch backend status and upload documents with strong response validation.

## Alternatives Considered

Vanilla TypeScript was rejected because the result UI has enough state to justify React. Next.js was rejected because server rendering is not needed for GitHub Pages.

