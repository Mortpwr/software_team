from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Student
from app.services.serializers import student_public

router = APIRouter(tags=["students"])


@router.get("/student/me")
def me(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    student = db.get(Student, session.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="student not found")
    return student_public(student, session.role)


@router.get("/students")
def list_students(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:
    if session.role not in {"teacher", "leader", "coordinator"}:
        raise HTTPException(status_code=403, detail="forbidden")
    rows = db.scalars(select(Student).order_by(Student.grade.desc(), Student.student_id)).all()
    return {"list": [student_public(row, session.role) for row in rows]}
