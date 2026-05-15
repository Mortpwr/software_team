from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import PartyProgress
from app.services.common import audit, now_ms
from app.services.seed_data import FLOW_STAGES
from app.services.serializers import party

router = APIRouter(tags=["party"])


@router.get("/party/progress")
def progress(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(PartyProgress, session.student_id)
    if not row:
        raise HTTPException(status_code=404, detail="party progress not found")
    return {"flowName": "入党流程", "stages": FLOW_STAGES, **party(row)}


@router.post("/party/tasks/{task_id}/done")
def complete_task(task_id: str, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(PartyProgress, session.student_id)
    if not row:
        raise HTTPException(status_code=404, detail="party progress not found")
    row.tasks = [{**task, "done": True} if task.get("id") == task_id else task for task in row.tasks]
    audit(db, session, "party_task_done", task_id)
    db.commit()
    return {"ok": True}


@router.post("/workbench/party/advance")
def advance(payload: dict, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role != "teacher":
        raise HTTPException(status_code=403, detail="forbidden")
    row = db.get(PartyProgress, payload.get("studentId"))
    if not row:
        raise HTTPException(status_code=404, detail="party progress not found")
    row.current_key = payload.get("nextKey", row.current_key)
    row.history = [*row.history, {"stageKey": row.current_key, "at": now_ms(), "remark": payload.get("remark", "管理端推进阶段")}]
    audit(db, session, "party_advance", row.student_id)
    db.commit()
    return party(row)
