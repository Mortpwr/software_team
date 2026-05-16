#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PYTHONPATH=backend
uvicorn app.main:app --host "${BACKEND_HOST:-127.0.0.1}" --port "${BACKEND_PORT:-8000}" --reload
