#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
PYTHONPATH=backend python3 - <<'PY'
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
checks = [
    ("GET", "/health", {}),
    ("GET", "/api/runtime", {}),
    ("GET", "/api/session", {"X-Student-Id": "2024201581", "X-Role": "student"}),
    ("GET", "/api/knowledge", {}),
    ("GET", "/api/workbench/summary", {"X-Student-Id": "2024201581", "X-Role": "teacher"}),
]
for method, path, headers in checks:
    res = client.request(method, path, headers=headers)
    print(method, path, res.status_code)
    if res.status_code >= 400:
        raise SystemExit(res.text)

login = client.post("/api/auth/login", json={"studentId": "2024201581", "role": "student", "password": "demo123456"})
print("POST", "/api/auth/login", login.status_code)
if login.status_code >= 400:
    raise SystemExit(login.text)
token = login.json()["token"]
session = client.get("/api/session", headers={"Authorization": f"Bearer {token}"})
print("GET", "/api/session bearer", session.status_code)
if session.status_code >= 400 or session.json()["studentId"] != "2024201581":
    raise SystemExit(session.text)
PY
