# 0009 - Configuration and Secrets Management

## Status

Accepted

## Context

The frontend cannot hold secrets. The backend needs deployment-specific settings for CORS, upload limits, timeouts, and tool paths.

## Decision

Use environment variables parsed with viper and envconfig. Commit `.env.example` files only. Real `.env` files stay gitignored.

## Consequences

The same Docker image can run locally, in staging, or in production. Secret scanning is enforced by local hooks when `gitleaks` is installed.

## Alternatives Considered

Checked-in config files with environment overlays were rejected because they make accidental secret commits more likely.

