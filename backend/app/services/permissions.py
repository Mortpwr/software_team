from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import CurrentSession
from app.models import Student

STUDENT = "student"
TEACHER = "teacher"
COORDINATOR = "coordinator"
LEADER = "leader"


def require_roles(session: CurrentSession, *roles: str) -> None:
    if session.role not in set(roles):
        raise HTTPException(status_code=403, detail="forbidden")


def current_student(db: Session, session: CurrentSession) -> Student:
    row = db.get(Student, session.student_id)
    if not row:
        raise HTTPException(status_code=404, detail="student not found")
    return row


def scoped_student_ids(db: Session, session: CurrentSession):
    if session.role != COORDINATOR:
        return None
    current = current_student(db, session)
    return select(Student.student_id).where(Student.class_name == current.class_name)
