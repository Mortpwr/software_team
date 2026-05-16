import base64
import hashlib
import hmac
import json
import time
from typing import Any

from app.core.config import get_settings


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _sign(payload: str) -> str:
    secret = get_settings().auth_secret.encode("utf-8")
    return _b64(hmac.new(secret, payload.encode("ascii"), hashlib.sha256).digest())


def issue_token(student_id: str, role: str) -> str:
    now = int(time.time())
    payload = {
        "studentId": student_id,
        "role": role,
        "iat": now,
        "exp": now + get_settings().auth_token_hours * 3600,
    }
    encoded = _b64(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    return f"{encoded}.{_sign(encoded)}"


def verify_token(token: str) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    encoded, signature = token.rsplit(".", 1)
    if not hmac.compare_digest(_sign(encoded), signature):
        return None
    try:
        payload = json.loads(_unb64(encoded).decode("utf-8"))
    except (ValueError, json.JSONDecodeError):
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    if not payload.get("studentId") or not payload.get("role"):
        return None
    return payload
