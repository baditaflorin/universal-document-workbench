# 0016 - Local Git Hooks

## Status

Accepted

## Context

No GitHub Actions are used. Checks need to run before local commits and pushes.

## Decision

Use plain `.githooks/` wired with `git config core.hooksPath .githooks` via `make install-hooks`.

Hooks:

- `pre-commit`: Go format/vet/lint, frontend lint/format/typecheck/build, gitleaks when available.
- `commit-msg`: Conventional Commits validator.
- `pre-push`: `make test`, `make build`, `make smoke`.
- `post-merge` and `post-checkout`: generated-code refresh placeholder.

## Consequences

The project stays CI-free while still giving contributors a repeatable local gate.

## Alternatives Considered

Lefthook was rejected to avoid another required tool in v1.

