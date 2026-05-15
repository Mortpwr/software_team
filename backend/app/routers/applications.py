from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Application, Student
from app.schemas import ApplicationCreate, ApplicationDecision
from app.services.common import audit, now_ms, uid
from app.services.serializers import application

router = APIRouter(tags=["applications"])
WINDOW_SECONDS = 48 * 3600
STATUS_DRAFT = "草稿"
STATUS_PENDING = "审批中"
STATUS_APPROVED = "已通过"
STATUS_REJECTED = "已驳回"
STATUS_REVOKED = "已撤回"
STATUS_RE_APPROVED = "已重批"


@router.get("/applications")
def list_applications(
    scope: str = "",
    status: str = "",
    db: Session = Depends(get_db),
    session: CurrentSession = Depends(get_current_session),
) -> dict:
    stmt = select(Application)
    if scope == "workbench":
        if session.role not in {"teacher", "leader", "coordinator"}:
            raise HTTPException(status_code=403, detail="forbidden")
        if session.role == "coordinator":
            current = db.get(Student, session.student_id)
            if not current:
                raise HTTPException(status_code=404, detail="student not found")
            class_students = select(Student.student_id).where(Student.class_name == current.class_name)
            stmt = stmt.where(Application.student_id.in_(class_students))
    else:
        stmt = stmt.where(Application.student_id == session.student_id)
    if status:
        stmt = stmt.where(Application.status == status)
    rows = db.scalars(stmt.order_by(Application.created_at.desc())).all()
    return {"list": [application(row) for row in rows]}


@router.get("/applications/draft")
def get_draft(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict | None:
    row = db.scalars(
        select(Application)
        .where(Application.student_id == session.student_id, Application.status == STATUS_DRAFT)
        .order_by(Application.updated_at.desc()),
    ).first()
    return application(row) if row else None


@router.post("/applications/draft")
def save_draft(payload: ApplicationCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.scalars(
        select(Application)
        .where(Application.student_id == session.student_id, Application.status == STATUS_DRAFT)
        .order_by(Application.updated_at.desc()),
    ).first()
    if row:
        row.type = payload.type
        row.subtype = payload.subtype
        row.form = payload.form
        row.attachments = payload.attachments
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "学生", "action": "保存草稿", "remark": payload.remark}]
    else:
        row = Application(
            id=uid("draft"),
            student_id=session.student_id,
            type=payload.type,
            subtype=payload.subtype,
            status=STATUS_DRAFT,
            form=payload.form,
            attachments=payload.attachments,
            audit_trail=[{"at": now_ms(), "actor": "学生", "action": "保存草稿", "remark": payload.remark}],
        )
        db.add(row)
    audit(db, session, "application_draft_save", row.id)
    db.commit()
    return application(row)


@router.post("/applications")
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if payload.type == "盖章申请" and not payload.attachments:
        raise HTTPException(status_code=400, detail="盖章申请须上传附件")
    row = Application(
        id=uid("app"),
        student_id=session.student_id,
        type=payload.type,
        subtype=payload.subtype,
        status=STATUS_PENDING,
        form=payload.form,
        attachments=payload.attachments,
        audit_trail=[
            {"at": now_ms(), "actor": "学生", "action": "已提交", "remark": payload.remark},
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
    if row.student_id != session.student_id and session.role not in {"teacher", "leader", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    return application(row)


@router.post("/applications/{app_id}/submit")
def submit_existing_application(
    app_id: str,
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    session: CurrentSession = Depends(get_current_session),
) -> dict:
    row = db.get(Application, app_id)
    if not row or row.student_id != session.student_id:
        raise HTTPException(status_code=404, detail="application not found")
    if row.status not in {STATUS_DRAFT, STATUS_REJECTED}:
        raise HTTPException(status_code=400, detail="invalid state")
    if payload.type == "盖章申请" and not payload.attachments:
        raise HTTPException(status_code=400, detail="盖章申请须上传附件")
    previous_status = row.status
    row.type = payload.type
    row.subtype = payload.subtype
    row.form = payload.form
    row.attachments = payload.attachments
    row.status = STATUS_PENDING
    row.teacher_comment = ""
    row.decided_at = None
    row.audit_trail = [
        *row.audit_trail,
        {"at": now_ms(), "actor": "学生", "action": "重提" if previous_status == STATUS_REJECTED else "已提交", "remark": payload.remark},
        {"at": now_ms(), "actor": "系统", "action": "进入审批队列", "remark": ""},
    ]
    audit(db, session, "application_resubmit" if previous_status == STATUS_REJECTED else "application_submit", row.id)
    db.commit()
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
    if action in {"approve", "reject"} and row.status != STATUS_PENDING:
        raise HTTPException(status_code=400, detail="invalid state")
    if action == "approve":
        row.status = STATUS_APPROVED
        row.teacher_comment = payload.comment or "同意。"
        row.decided_at = datetime.now(timezone.utc)
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "管理老师", "action": "通过", "remark": row.teacher_comment}]
    elif action == "reject":
        row.status = STATUS_REJECTED
        row.teacher_comment = payload.reason or "材料不全，请补充后重提。"
        row.decided_at = datetime.now(timezone.utc)
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "管理老师", "action": "驳回", "remark": row.teacher_comment}]
    elif action in {"revoke", "reapprove"}:
        if row.status not in {STATUS_APPROVED, STATUS_REJECTED} or not row.decided_at:
            raise HTTPException(status_code=400, detail="invalid state")
        if (datetime.now(timezone.utc) - row.decided_at).total_seconds() > WINDOW_SECONDS:
            raise HTTPException(status_code=400, detail="window closed")
        row.status = STATUS_REVOKED if action == "revoke" else STATUS_RE_APPROVED
        row.teacher_comment = payload.reason or payload.comment or "规则窗口内调整结论。"
        row.audit_trail = [*row.audit_trail, {"at": now_ms(), "actor": "管理老师", "action": row.status, "remark": row.teacher_comment}]
    else:
        raise HTTPException(status_code=404, detail="unknown action")
    audit(db, session, f"application_{action}", app_id)
    db.commit()
    return application(row)
