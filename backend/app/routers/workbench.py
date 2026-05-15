from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Application, AuditLog, KnowledgeItem, Notice, NoticeBatch, Student
from app.services.serializers import audit_log

router = APIRouter(tags=["workbench"])


@router.get("/workbench/summary")
def summary(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    return {
        "students": db.scalar(select(func.count()).select_from(Student)) or 0,
        "pendingApps": db.scalar(select(func.count()).select_from(Application).where(Application.status == "审批中")) or 0,
        "miss": db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.action == "knowledge_miss")) or 0,
        "batches": db.scalar(select(func.count()).select_from(NoticeBatch)) or 0,
        "sms": 0,
    }


@router.get("/leader/dashboard")
def leader_dashboard(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role != "leader":
        raise HTTPException(status_code=403, detail="forbidden")
    apps = db.scalars(select(Application)).all()
    by_status: dict[str, int] = {}
    for app in apps:
        by_status[app.status] = by_status.get(app.status, 0) + 1
    return {
        "students": db.scalar(select(func.count()).select_from(Student)) or 0,
        "knowledgeCount": db.scalar(select(func.count()).select_from(KnowledgeItem)) or 0,
        "noticeCount": db.scalar(select(func.count()).select_from(Notice)) or 0,
        "pendingApps": by_status.get("审批中", 0),
        "applicationsByStatus": by_status,
        "missKeywordsTop": [],
        "academicHighRiskStudents": 0,
        "batches": db.scalar(select(func.count()).select_from(NoticeBatch)) or 0,
        "lastReset": None,
    }


@router.get("/audit/logs")
def logs(limit: int = 120, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader"}:
        raise HTTPException(status_code=403, detail="forbidden")
    rows = db.scalars(select(AuditLog).order_by(AuditLog.at.desc()).limit(limit)).all()
    return {"list": [audit_log(row) for row in rows]}
