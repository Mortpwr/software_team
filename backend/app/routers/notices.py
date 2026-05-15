from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Message, Notice, NoticeBatch, Student
from app.schemas import NoticePublish
from app.services.common import audit, uid
from app.services.serializers import batch, message, notice

router = APIRouter(tags=["notices"])


@router.get("/notices")
def list_notices(db: Session = Depends(get_db)) -> dict:
    rows = db.scalars(select(Notice).order_by(Notice.published_at.desc())).all()
    return {"list": [notice(row) for row in rows]}


@router.get("/notices/{notice_id}")
def get_notice(notice_id: str, db: Session = Depends(get_db)) -> dict:
    row = db.get(Notice, notice_id)
    if not row:
        raise HTTPException(status_code=404, detail="notice not found")
    return notice(row)


@router.get("/messages/inbox")
def inbox(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    rows = db.scalars(select(Message).where(Message.student_id == session.student_id).order_by(Message.created_at.desc())).all()
    return {"list": [message(row) for row in rows], "unread": sum(1 for row in rows if not row.read_at)}


@router.post("/messages/{message_id}/read")
def mark_read(message_id: str, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(Message, message_id)
    if not row or row.student_id != session.student_id:
        raise HTTPException(status_code=404, detail="message not found")
    row.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/workbench/notices/publish")
def publish_notice(payload: NoticePublish, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    notice_row = Notice(
        id=uid("n"),
        title=payload.title,
        tags=payload.tags,
        summary=payload.summary or payload.title,
        content=payload.content or payload.summary,
        source=payload.source,
        published_at=datetime.now(timezone.utc),
    )
    students = db.scalars(select(Student)).all()
    current = db.get(Student, session.student_id)
    targets = [s for s in students if match_rule(payload.target_rule, s, session, current)]
    batch_row = NoticeBatch(
        id=uid("batch"),
        title=payload.title,
        target_rule=payload.target_rule,
        channels=[
            {"name": "站内", "sendOk": len(targets), "sendFail": 0, "deliverOk": len(targets), "deliverFail": 0, "read": 0, "observability": "可读"},
            {"name": "邮件", "sendOk": len(targets), "sendFail": 0, "deliverOk": 0, "deliverFail": 0, "read": 0, "observability": "不可观测"},
            {"name": "短信(模拟)", "sendOk": len(targets), "sendFail": 0, "deliverOk": 0, "deliverFail": 0, "read": 0, "observability": "模拟"},
        ],
    )
    db.add(notice_row)
    db.add(batch_row)
    for student in targets:
        db.add(
            Message(
                id=uid("msg"),
                student_id=student.student_id,
                notice_id=notice_row.id,
                title=notice_row.title,
                summary=notice_row.summary,
                batch_id=batch_row.id,
                channels=[{"name": "站内", "state": "发送请求成功", "detail": "送达成功"}],
            ),
        )
    audit(db, session, "notice_publish", batch_row.id, {"reach": len(targets)})
    db.commit()
    return {"notice": notice(notice_row), "batchId": batch_row.id, "reach": len(targets)}


@router.get("/workbench/batches")
def list_batches(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    rows = db.scalars(select(NoticeBatch).order_by(NoticeBatch.created_at.desc())).all()
    return {"list": [batch_with_read_stats(db, row) for row in rows]}


def batch_with_read_stats(db: Session, row: NoticeBatch) -> dict:
    payload = batch(row)
    read_count = db.scalar(
        select(func.count())
        .select_from(Message)
        .where(Message.batch_id == row.id, Message.read_at.is_not(None)),
    ) or 0
    payload["channels"] = [
        {**channel, "read": read_count} if channel.get("name") == "站内" else channel
        for channel in payload["channels"]
    ]
    return payload


def match_rule(rule: dict, student: Student, session: CurrentSession, current: Student | None) -> bool:
    if session.role == "coordinator":
        if not current or student.class_name != current.class_name:
            return False
    kind = (rule or {}).get("kind", "all")
    value = (rule or {}).get("value", "")
    if kind == "all":
        return True
    if kind == "grade":
        return student.grade == value
    if kind == "major":
        return value in student.major
    if kind == "class":
        return student.class_name == value
    return True
