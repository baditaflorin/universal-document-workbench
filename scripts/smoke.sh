#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_PORT="${WEB_PORT:-43173}"
API_PORT="${API_PORT:-43180}"
BASE_PATH="/universal-document-workbench"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for() {
  local url="$1"
  for _ in {1..60}; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

APP_ADDR=":${API_PORT}" \
APP_PROCESSOR_MODE=stub \
APP_PUBLIC_ORIGIN="http://127.0.0.1:${WEB_PORT}" \
APP_WORK_DIR="$ROOT_DIR/tmp/smoke" \
CGO_ENABLED=0 \
  go run "$ROOT_DIR/cmd/server" &
API_PID=$!
sleep 0.2
kill -0 "$API_PID" 2>/dev/null
wait_for "http://127.0.0.1:${API_PORT}/healthz"
wait_for "http://127.0.0.1:${API_PORT}/readyz"
wait_for "http://127.0.0.1:${API_PORT}/metrics"

VITE_API_BASE_URL="http://127.0.0.1:${API_PORT}" \
APP_VERSION="${APP_VERSION:-0.1.0}" \
GIT_COMMIT="${GIT_COMMIT:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo dev)}" \
  "$ROOT_DIR/scripts/build-pages.sh"

test -f "$ROOT_DIR/docs/index.html"
test -f "$ROOT_DIR/docs/404.html"

node "$ROOT_DIR/scripts/static-server.mjs" "$ROOT_DIR/docs" "$WEB_PORT" "$BASE_PATH" &
WEB_PID=$!
sleep 0.2
kill -0 "$WEB_PID" 2>/dev/null
wait_for "http://127.0.0.1:${WEB_PORT}${BASE_PATH}/"

PLAYWRIGHT_BASE_URL="http://127.0.0.1:${WEB_PORT}${BASE_PATH}/" npm --prefix "$ROOT_DIR/frontend" run e2e
