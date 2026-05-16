from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.deps import CurrentSession
from app.models import Student
from app.schemas import LoginRequest
from app.services.auth_tokens import issue_token
from app.services.common import audit
from app.services.permissions import COORDINATOR, LEADER, STUDENT, TEACHER
from app.services.serializers import student_public

router = APIRouter(prefix="/auth", tags=["auth"])

VALID_ROLES = {STUDENT, TEACHER, COORDINATOR, LEADER}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=401, detail="unknown identity")
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="invalid role")
    if payload.password != get_settings().auth_demo_password:
        raise HTTPException(status_code=401, detail="invalid credential")

    token = issue_token(payload.student_id, payload.role)
    audit(
        db,
        CurrentSession(student_id=payload.student_id, role=payload.role, token=token),
        "auth_login",
        payload.student_id,
        {"role": payload.role},
    )
    db.commit()
    return {
        "token": token,
        "studentId": payload.student_id,
        "role": payload.role,
        "student": student_public(student, payload.role),
        "expiresInHours": get_settings().auth_token_hours,
    }
