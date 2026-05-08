# 0010 - GitHub Pages Publishing Strategy

## Status

Accepted

## Context

The live GitHub Pages URL is a first-class deliverable from the first scaffold commit. The repository also needs `docs/adr/` and project documentation. The frontend must build to a Pages-ready directory with hashed assets, correct base path, and a SPA fallback.

## Decision

Publish GitHub Pages from the `main` branch `/docs` directory.

The Vite frontend source lives outside `docs/` and builds into `docs/` with `emptyOutDir: false` so ADRs and documentation remain in place. The build writes `docs/index.html`, `docs/404.html`, hashed static assets, `docs/manifest.webmanifest`, and service worker files.

The Vite base path is `/universal-document-workbench/`.

## Consequences

- The published site is available at https://baditaflorin.github.io/universal-document-workbench/.
- `docs/` is intentionally committed and is not gitignored.
- Documentation Markdown files coexist with the built frontend.
- Rollback is a normal git revert of the publishing commit.
- GitHub Pages does not support `_headers` or `_redirects`, so SPA routing uses a committed `404.html` fallback.

## Alternatives Considered

- `gh-pages` branch: rejected to keep all deliverables visible in `main` and to keep local smoke tests simple.
- Repository root publishing: rejected because source files and app build output would be mixed at the public root.

