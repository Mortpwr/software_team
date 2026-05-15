from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Application
from app.schemas import ApplicationCreate, ApplicationDecision
from app.services.common import audit, now_ms, uid
from app.services.serializers import application

router = APIRouter(tags=["applications"])
WINDOW_SECONDS = 48 * 3600


@router.get("/applications")
def list_applications(
    scope: str = "",
    status: str = "",
    db: Session = Depends(get_db),
    session: CurrentSession = Depends(get_current_session),
) -> dict:
    stmt = select(Application)
    if scope == "workbench":
        if session.role not in {"teacher", "leader"}:
            raise HTTPException(status_code=403, detail="forbidden")
    else:
        stmt = stmt.where(Application.student_id == session.student_id)
    if status:
        stmt = stmt.where(Application.status == status)
    rows = db.scalars(stmt.order_by(Application.created_at.desc())).all()
    return {"list": [application(row) for row in rows]}


@router.post("/applications")
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if payload.type == "盖章申请" and not payload.attachments:
        raise HTTPException(status_code=400, detail="盖章申请须上传附件")
    row = Application(
        id=uid("app"),
        student_id=session.student_id,
        type=payload.type,
        subtype=payload.subtype,
        status="审批中",
        form=payload.form,
        attachments=payload.attachments,
        audit_trail=[
            {"at": now_ms(), "actor": "学生", "action": "提交", "remark": payload.remark},
            {"at": now_ms(), "actor": "系统", "action": "进入审批队列", "remark": ""},
        ],
    )
    db.add(row)
    audit(db, session, "application_create", row.id)
    db.commit()
    return application(row)


@router.get("/applications/{app_id}")
def get_application(app_id: str, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(Application, app_id)
    if not row:
        raise HTTPException(status_code=404, detail="application not found")
    if row.student_id != session.student_id and session.role not in {"teacher", "leader"}:
        raise HTTPException(status_code=403, detail="forbidden")
    return application(row)


@router.post("/workbench/applications/{app_id}/{action}")
def decide_application(
    app_id: str,
    action: str,
    payload: ApplicationDecision,
    db: Session = Depends(get_db),
    session: CurrentSession = Depends(get_current_session),
) -> dict:
    if session.role != "teacher":
        raise HTTPException(status_code=403, detail="forbidden")
    row = db.get(Application, app_id)
    if not row:
        raise HTTPException(status_code=404, detail="application not found")
    if action in {"approve", "reject"} and row.status != "审批中":
        raise HTTPException(status_code=400, detail="invalid state")
    if action == "approve":
        row.status = "已通过"
        row.teacher_comment = payload.comment or "同意。"
        row.decided_at = datetime.now(timezone.utc)
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "管理老师", "action": "通过", "remark": row.teacher_comment}]
    elif action == "reject":
        row.status = "已驳回"
        row.teacher_comment = payload.reason or "材料不全，请补充后重提。"
        row.decided_at = datetime.now(timezone.utc)
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "管理老师", "action": "驳回", "remark": row.teacher_comment}]
    elif action in {"revoke", "reapprove"}:
        if row.status not in {"已通过", "已驳回"} or not row.decided_at:
            raise HTTPException(status_code=400, detail="invalid state")
        if (datetime.now(timezone.utc) - row.decided_at).total_seconds() > WINDOW_SECONDS:
            raise HTTPException(status_code=400, detail="window closed")
        row.status = "已撤回" if action == "revoke" else "已重批"
        row.teacher_comment = payload.reason or payload.comment or "规则窗口内调整结论。"
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "管理老师", "action": row.status, "remark": row.teacher_comment}]
    else:
        raise HTTPException(status_code=404, detail="unknown action")
    audit(db, session, f"application_{action}", app_id)
    db.commit()
    return application(row)
