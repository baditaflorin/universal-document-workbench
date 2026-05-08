#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ADDR="${APP_ADDR:-:8080}"
APP_PROCESSOR_MODE="${APP_PROCESSOR_MODE:-stub}"
APP_PUBLIC_ORIGIN="${APP_PUBLIC_ORIGIN:-http://localhost:5173,http://127.0.0.1:5173}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

APP_ADDR="$APP_ADDR" \
APP_PROCESSOR_MODE="$APP_PROCESSOR_MODE" \
APP_PUBLIC_ORIGIN="$APP_PUBLIC_ORIGIN" \
APP_WORK_DIR="$ROOT_DIR/tmp/dev" \
CGO_ENABLED=0 \
  go run "$ROOT_DIR/cmd/server" &
SERVER_PID=$!

VITE_API_BASE_URL="http://localhost:${APP_ADDR#:}" npm --prefix "$ROOT_DIR/frontend" run dev
