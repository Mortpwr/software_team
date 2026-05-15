from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import KnowledgeItem, TemplateFile
from app.schemas import KnowledgeCreate
from app.services.common import audit, uid
from app.services.serializers import knowledge, template

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
def list_knowledge(
    q: str = "",
    category: str = "全部",
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(KnowledgeItem).where(KnowledgeItem.online.is_(True))
    if category and category != "全部":
        stmt = stmt.where(KnowledgeItem.category == category)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(KnowledgeItem.title.ilike(like), KnowledgeItem.summary.ilike(like), KnowledgeItem.body.ilike(like)))
    rows = db.scalars(stmt.order_by(KnowledgeItem.updated_at.desc())).all()
    categories = ["全部", *db.scalars(select(KnowledgeItem.category).distinct()).all()]
    templates = db.scalars(select(TemplateFile).order_by(TemplateFile.name)).all()
    return {"list": [knowledge(row) for row in rows], "categories": categories, "templates": [template(row) for row in templates]}


@router.post("")
def create_knowledge(payload: KnowledgeCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role != "teacher":
        raise HTTPException(status_code=403, detail="forbidden")
    row = KnowledgeItem(
        id=uid("k"),
        title=payload.title,
        category=payload.category,
        tags=payload.tags,
        summary=payload.summary,
        body=payload.body,
        sensitive_hint=payload.sensitive_hint,
    )
    db.add(row)
    audit(db, session, "knowledge_create", row.id)
    db.commit()
    return knowledge(row)


@router.post("/miss")
def record_miss(payload: dict, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    keyword = str(payload.get("keyword", "")).strip()
    audit(db, session, "knowledge_miss", keyword)
    db.commit()
    return {"ok": True}


@router.get("/{item_id}")
def get_knowledge(item_id: str, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    row = db.get(KnowledgeItem, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="knowledge not found")
    row.hit_count += 1
    audit(db, session, "knowledge_read", item_id)
    db.commit()
    return knowledge(row)
