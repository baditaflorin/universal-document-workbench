#!/bin/bash
set -euo pipefail

message_file="${1:-}"
if [[ -z "$message_file" || ! -f "$message_file" ]]; then
  echo "Commit message file is required." >&2
  exit 1
fi

first_line="$(head -n 1 "$message_file")"
pattern='^(feat|fix|docs|chore|refactor|test|ops|data)(\([a-zA-Z0-9_-]+\))?!?: .+'

if [[ ! "$first_line" =~ $pattern ]]; then
  echo "Commit message must use Conventional Commits." >&2
  echo "Got: $first_line" >&2
  exit 1
fi
