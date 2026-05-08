# 0015 - Deployment Topology

## Status

Accepted

## Context

Mode C requires GitHub Pages for the frontend and a Docker backend behind nginx.

## Decision

Deploy the frontend from GitHub Pages at https://baditaflorin.github.io/universal-document-workbench/. Deploy the backend with Docker Compose using:

- `app`: prebuilt GHCR image.
- `nginx`: TLS, CORS, rate limiting, and proxying.
- `prometheus`: optional profile.

The public host port `25342` maps to nginx HTTPS.

## Consequences

The backend can be hosted on a private server while the public frontend remains static.

## Alternatives Considered

Serving the frontend from the Go backend was rejected because the frontend must live on GitHub Pages.

