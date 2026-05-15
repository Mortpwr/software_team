from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import AcademicPlan, AcademicProgress, Student
from app.schemas import AcademicProgressPut, TranscriptMetaCreate
from app.services.common import audit
from app.services.serializers import academic_plan, academic_progress

router = APIRouter(prefix="/academic", tags=["academic"])


@router.get("/plan")
def plan(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    student = db.get(Student, session.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="student not found")
    key = f"{student.grade}|{student.major}"
    return {"plan": academic_plan(db.get(AcademicPlan, key)), "progress": academic_progress(db.get(AcademicProgress, session.student_id))}


@router.get("/report")
def report(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    payload = plan(db, session)
    plan_row = payload["plan"]
    progress_row = payload["progress"]
    if not plan_row or not progress_row:
        return {"ok": False, "message": "缺少培养方案或学业进度。"}
    progress_by_key = {item["key"]: item for item in progress_row["modules"]}
    modules = []
    for item in plan_row["modules"]:
        earned = float(progress_by_key.get(item["key"], {}).get("earned", 0))
        gap = max(0, float(item["required"]) - earned)
        modules.append({**item, "earned": earned, "gap": gap, "risk": "高" if gap >= 4 else "中" if gap >= 2 else "低"})
    return {
        "ok": True,
        "modules": modules,
        "riskLevel": "高" if any(m["risk"] == "高" for m in modules) else "中" if any(m["risk"] == "中" for m in modules) else "低",
        "suggestions": [{"focus": m["name"], "hint": f"仍需约 {m['gap']} 学分，请关注 {m['name']} 相关课程。"} for m in modules if m["gap"] > 0],
        "uploads": progress_row["uploads"],
    }


@router.put("/progress")
def put_progress(payload: AcademicProgressPut, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(AcademicProgress, session.student_id)
    if not row:
        row = AcademicProgress(student_id=session.student_id)
        db.add(row)
    row.modules = payload.modules
    audit(db, session, "academic_progress_put", session.student_id)
    db.commit()
    return {"ok": True}


@router.post("/transcript")
def transcript(payload: TranscriptMetaCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(AcademicProgress, session.student_id)
    if not row:
        raise HTTPException(status_code=404, detail="academic progress not found")
    row.uploads = [{"at": int(datetime.now(timezone.utc).timestamp() * 1000), **payload.meta}, *row.uploads]
    audit(db, session, "academic_transcript_meta", session.student_id, payload.meta)
    db.commit()
    return {"ok": True}
