from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from sqlalchemy import or_, select

from sqlalchemy.orm import Session



from app.db.session import get_db

from app.deps import CurrentSession, get_current_session

from app.models import Honor

from app.schemas import HonorCreate, HonorOnlinePut

from app.services.common import audit, uid
from app.services.file_storage import attachment_file_ids, cleanup_orphan_files

from app.services.permissions import COORDINATOR, LEADER, TEACHER, require_roles

from app.services.serializers import honor_public



router = APIRouter(prefix="/honors", tags=["honors"])





@router.get("")

def list_honors(

    year: str = "",

    major: str = "",

    category: str = "",

    grade: str = "",

    q: str = "",

    include_offline: bool = False,

    db: Session = Depends(get_db),

    session: CurrentSession = Depends(get_current_session),

) -> dict:

    stmt = select(Honor)

    if session.role in {"student", "coordinator"} and not include_offline:

        stmt = stmt.where(Honor.online.is_(True))

    elif include_offline and session.role not in {TEACHER, LEADER}:

        raise HTTPException(status_code=403, detail="forbidden")

    if year:

        stmt = stmt.where(Honor.year == int(year))

    if major:

        stmt = stmt.where(Honor.major.ilike(f"%{major}%"))

    if category:

        stmt = stmt.where(Honor.category == category)

    if grade:

        stmt = stmt.where(Honor.grade.ilike(f"%{grade}%"))

    if q:

        like = f"%{q}%"
        stmt = stmt.where(or_(Honor.title.ilike(like), Honor.winner.ilike(like), Honor.category.ilike(like), Honor.intro.ilike(like)))

    rows = db.scalars(stmt.order_by(Honor.year.desc())).all()

    return {"list": [honor_public(row, session.role) for row in rows]}





@router.post("")

def create_honor(payload: HonorCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    require_roles(session, TEACHER)

    row = Honor(

        id=uid("honor"),

        title=payload.title,

        winner=payload.winner,

        year=payload.year,

        major=payload.major,

        grade=payload.grade,

        category=payload.category,

        intro=payload.intro,

        visibility=payload.visibility if payload.visibility in {"public", "restricted"} else "public",

        online=payload.online is not False,

        attachments=normalize_attachments(payload.attachments, payload.visibility),

    )

    db.add(row)

    audit(db, session, "honor_create", row.id)

    db.commit()

    return honor_public(row, session.role)





@router.put("/{honor_id}")

def update_honor(honor_id: str, payload: HonorCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    require_roles(session, TEACHER)

    row = db.get(Honor, honor_id)

    if not row:

        raise HTTPException(status_code=404, detail="honor not found")
    old_file_ids = attachment_file_ids(row.attachments)

    row.title = payload.title

    row.winner = payload.winner

    row.year = payload.year

    row.major = payload.major

    row.grade = payload.grade

    row.category = payload.category

    row.intro = payload.intro

    row.visibility = payload.visibility if payload.visibility in {"public", "restricted"} else "public"

    row.online = payload.online is not False

    row.attachments = normalize_attachments(payload.attachments, payload.visibility)

    audit(db, session, "honor_update", honor_id)

    db.commit()
    cleanup_orphan_files(db, old_file_ids - attachment_file_ids(row.attachments))

    return honor_public(row, session.role)





@router.post("/{honor_id}/online")

def set_honor_online(

    honor_id: str,

    payload: HonorOnlinePut,

    db: Session = Depends(get_db),

    session: CurrentSession = Depends(get_current_session),

) -> dict:

    require_roles(session, TEACHER)

    row = db.get(Honor, honor_id)

    if not row:

        raise HTTPException(status_code=404, detail="honor not found")

    row.online = payload.online

    audit(db, session, "honor_online" if payload.online else "honor_offline", honor_id)

    db.commit()

    return honor_public(row, session.role)





@router.delete("/{honor_id}")
def delete_honor(honor_id: str, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    require_roles(session, TEACHER)

    row = db.get(Honor, honor_id)

    if not row:

        raise HTTPException(status_code=404, detail="honor not found")
    old_file_ids = attachment_file_ids(row.attachments)

    db.delete(row)

    audit(db, session, "honor_delete", honor_id)

    db.commit()
    cleanup_orphan_files(db, old_file_ids)

    return {"ok": True, "id": honor_id}



@router.post('/workbench/import')
async def import_honors(
    file: UploadFile = File(...),
    dry_run: bool = Form(default=True, alias='dryRun'),
    db: Session = Depends(get_db),
    session: CurrentSession = Depends(get_current_session),
) -> dict:
    import csv
    from io import StringIO

    require_roles(session, TEACHER)
    text = (await file.read()).decode('utf-8-sig')
    reader = csv.DictReader(StringIO(text))
    rows = []
    errors = []
    for index, row in enumerate(reader, start=2):
        title = (row.get('标题') or row.get('title') or '').strip()
        winner = (row.get('获奖人') or row.get('winner') or '').strip()
        year_raw = (row.get('年份') or row.get('year') or '').strip()
        if not title or not winner or not year_raw:
            errors.append({'row': index, 'message': '标题、获奖人、年份必填'})
            continue
        try:
            year = int(year_raw)
        except ValueError:
            errors.append({'row': index, 'message': '年份须为整数'})
            continue
        rows.append(
            Honor(
                id=uid('honor'),
                title=title,
                winner=winner,
                year=year,
                major=(row.get('专业') or row.get('major') or '').strip(),
                grade=(row.get('年级') or row.get('grade') or '').strip(),
                category=(row.get('类别') or row.get('category') or '校级').strip(),
                intro=(row.get('简介') or row.get('intro') or '').strip(),
                visibility='public',
                online=True,
                attachments=[],
            ),
        )
    if dry_run or errors:
        return {'ok': not errors, 'dryRun': True, 'total': len(rows), 'errors': errors}
    for item in rows:
        db.add(item)
    audit(db, session, 'honors_import', file.filename or 'honors.csv', {'count': len(rows)})
    db.commit()
    return {'ok': True, 'dryRun': False, 'total': len(rows), 'errors': []}



def normalize_attachments(attachments: list[dict], visibility: str) -> list[dict]:

    allowed = visibility if visibility in {"public", "restricted"} else "public"

    return [{**item, "visibility": item.get("visibility") or allowed} for item in attachments or []]

