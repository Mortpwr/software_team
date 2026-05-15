import csv
from io import StringIO
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import Student
from app.services.permissions import COORDINATOR, LEADER, TEACHER, require_roles, scoped_student_ids
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
    require_roles(session, TEACHER, LEADER, COORDINATOR)
    stmt = select(Student)
    scope = scoped_student_ids(db, session)
    if scope is not None:
        stmt = stmt.where(Student.student_id.in_(scope))
    rows = db.scalars(stmt.order_by(Student.grade.desc(), Student.student_id)).all()
    return {"list": [student_public(row, session.role) for row in rows]}


@router.get("/students/export")
def export_students(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> Response:
    require_roles(session, TEACHER)
    rows = db.scalars(select(Student).order_by(Student.grade.desc(), Student.student_id)).all()
    fp = StringIO()
    writer = csv.writer(fp)
    writer.writerow(["学号", "姓名", "年级", "专业", "班级", "民族", "手机号(脱敏)", "政治面貌", "导师"])
    for row in rows:
        item = student_public(row, "leader")
        writer.writerow([
            item["studentId"],
            item["name"],
            item["grade"],
            item["major"],
            item["className"],
            item["nation"],
            item["phoneMasked"],
            item["politicalStatus"],
            item["tutor"],
        ])
    filename = quote("学生画像导出.csv")
    return Response(
        "\ufeff" + fp.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )
