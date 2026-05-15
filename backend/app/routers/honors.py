from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Honor
from app.schemas import HonorCreate
from app.services.common import audit, uid
from app.services.permissions import TEACHER, require_roles
from app.services.serializers import honor

router = APIRouter(prefix="/honors", tags=["honors"])


@router.get("")
def list_honors(year: str = "", major: str = "", category: str = "", db: Session = Depends(get_db)) -> dict:
    stmt = select(Honor)
    if year:
        stmt = stmt.where(Honor.year == int(year))
    if major:
        stmt = stmt.where(Honor.major.ilike(f"%{major}%"))
    if category:
        stmt = stmt.where(Honor.category == category)
    rows = db.scalars(stmt.order_by(Honor.year.desc())).all()
    return {"list": [honor(row) for row in rows]}


@router.post("")
def create_honor(payload: HonorCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    require_roles(session, TEACHER)
    row = Honor(id=uid("honor"), **payload.model_dump())
    db.add(row)
    audit(db, session, "honor_create", row.id)
    db.commit()
    return honor(row)


@router.put("/{honor_id}")
def update_honor(honor_id: str, payload: HonorCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    require_roles(session, TEACHER)
    row = db.get(Honor, honor_id)
    if not row:
        raise HTTPException(status_code=404, detail="honor not found")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    audit(db, session, "honor_update", honor_id)
    db.commit()
    return honor(row)
