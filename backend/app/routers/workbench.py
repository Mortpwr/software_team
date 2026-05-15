from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import AcademicPlan, AcademicProgress, Application, AuditLog, KnowledgeItem, Notice, NoticeBatch, Student
from app.services.serializers import audit_log

router = APIRouter(tags=["workbench"])


def knowledge_miss_rows(db: Session, limit: int) -> list[dict]:
    count_expr = func.count().label("count")
    last_at_expr = func.max(AuditLog.at).label("last_at")
    rows = db.execute(
        select(AuditLog.target, count_expr, last_at_expr)
        .where(AuditLog.action == "knowledge_miss", AuditLog.target != "")
        .group_by(AuditLog.target)
        .order_by(count_expr.desc())
        .limit(limit),
    ).all()
    return [
        {
            "keyword": row._mapping["target"],
            "count": row._mapping["count"],
            "lastAt": int(row._mapping["last_at"].timestamp() * 1000) if row._mapping["last_at"] else None,
        }
        for row in rows
    ]


@router.get("/workbench/summary")
def summary(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    student_filter = None
    if session.role == "coordinator":
        current = db.get(Student, session.student_id)
        if not current:
            raise HTTPException(status_code=404, detail="student not found")
        student_filter = select(Student.student_id).where(Student.class_name == current.class_name)
        student_count = db.scalar(select(func.count()).select_from(Student).where(Student.class_name == current.class_name)) or 0
    else:
        student_count = db.scalar(select(func.count()).select_from(Student)) or 0
    pending_stmt = select(func.count()).select_from(Application).where(Application.status == "审批中")
    if student_filter is not None:
        pending_stmt = pending_stmt.where(Application.student_id.in_(student_filter))
    return {
        "students": student_count,
        "pendingApps": db.scalar(pending_stmt) or 0,
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
        "missKeywordsTop": knowledge_miss_rows(db, 5),
        "academicHighRiskStudents": count_high_risk_students(db),
        "batches": db.scalar(select(func.count()).select_from(NoticeBatch)) or 0,
        "lastReset": None,
    }


@router.get("/audit/logs")
def logs(limit: int = 120, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader"}:
        raise HTTPException(status_code=403, detail="forbidden")
    rows = db.scalars(select(AuditLog).order_by(AuditLog.at.desc()).limit(limit)).all()
    return {"list": [audit_log(row) for row in rows]}


@router.get("/workbench/knowledge/misses")
def knowledge_misses(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader"}:
        raise HTTPException(status_code=403, detail="forbidden")
    return {"list": knowledge_miss_rows(db, 50)}


@router.get("/workbench/sms")
def sms_simulation(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    rows = db.scalars(select(NoticeBatch).order_by(NoticeBatch.created_at.desc()).limit(50)).all()
    return {
        "list": [
            {
                "id": f"sms_{row.id}",
                "batchId": row.id,
                "at": int(row.created_at.timestamp() * 1000) if row.created_at else None,
                "audience": [],
                "text": f"[模拟短信] {row.title}",
            }
            for row in rows
            if any(channel.get("name") == "短信(模拟)" for channel in (row.channels or []))
        ],
    }


def count_high_risk_students(db: Session) -> int:
    students = db.scalars(select(Student)).all()
    total = 0
    for student in students:
        plan = db.get(AcademicPlan, f"{student.grade}|{student.major}")
        progress = db.get(AcademicProgress, student.student_id)
        if not plan or not progress:
            continue
        progress_by_key = {item.get("key"): item for item in (progress.modules or [])}
        for module in plan.modules or []:
            earned = float(progress_by_key.get(module.get("key"), {}).get("earned", 0))
            if max(0, float(module.get("required", 0)) - earned) >= 4:
                total += 1
                break
    return total
