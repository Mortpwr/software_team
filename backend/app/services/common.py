from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.deps import CurrentSession
from app.models import AuditLog


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def dt_ms(value: datetime | None) -> int | None:
    if value is None:
        return None
    return int(value.timestamp() * 1000)


def audit(db: Session, session: CurrentSession, action: str, target: str, detail: dict | None = None) -> None:
    db.add(
        AuditLog(
            actor_id=session.student_id,
            role=session.role,
            action=action,
            target=target,
            detail=detail or {},
        ),
    )


def mask_phone(phone: str) -> str:
    if not phone or len(phone) < 7:
        return phone or ""
    return f"{phone[:3]}****{phone[-4:]}"
