#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_VERSION="${APP_VERSION:-0.2.0}"
GIT_COMMIT="${GIT_COMMIT:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo dev)}"
API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8080}"
OUT_DIR="${VITE_OUT_DIR:-$ROOT_DIR/docs}"

rm -rf "$OUT_DIR/assets"

VITE_APP_VERSION="$APP_VERSION" \
VITE_GIT_COMMIT="$GIT_COMMIT" \
VITE_API_BASE_URL="$API_BASE_URL" \
VITE_OUT_DIR="$OUT_DIR" \
  npm --prefix "$ROOT_DIR/frontend" run build

cp "$OUT_DIR/index.html" "$OUT_DIR/404.html"
touch "$OUT_DIR/.nojekyll"
