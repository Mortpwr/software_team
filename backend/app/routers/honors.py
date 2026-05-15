from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Honor
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
