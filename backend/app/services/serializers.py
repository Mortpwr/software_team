from app.models import (
    AcademicPlan,
    AcademicProgress,
    Application,
    AuditLog,
    Honor,
    KnowledgeItem,
    Message,
    Notice,
    NoticeBatch,
    PartyProgress,
    Student,
    TemplateFile,
)
from app.services.common import dt_ms, mask_phone


def student_public(row: Student, role: str) -> dict:
    base = {
        "studentId": row.student_id,
        "name": row.name,
        "grade": row.grade,
        "major": row.major,
        "className": row.class_name,
        "nation": row.nation,
        "politicalStatus": row.political_status,
        "tutor": row.tutor,
        "extension": row.extension or {},
        "phoneMasked": mask_phone(row.phone),
    }
    if role == "teacher":
        base.update({"phone": row.phone, "hometown": row.hometown, "idCardMasked": "**************"})
    elif role == "leader":
        base.update({"hometown": f"{row.hometown[:1]}**" if row.hometown else ""})
    return base


def knowledge(row: KnowledgeItem) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "category": row.category,
        "tags": row.tags or [],
        "summary": row.summary,
        "body": row.body,
        "sensitiveHint": row.sensitive_hint,
        "attachments": row.attachments or [],
        "updatedAt": dt_ms(row.updated_at),
        "hitCount": row.hit_count,
    }


def template(row: TemplateFile) -> dict:
    return {"id": row.id, "name": row.name, "scene": row.scene, "format": row.format, "fileUrl": row.file_url}


def notice(row: Notice) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "tags": row.tags or [],
        "summary": row.summary,
        "content": row.content,
        "source": row.source,
        "publishedAt": dt_ms(row.published_at),
    }


def message(row: Message) -> dict:
    return {
        "id": row.id,
        "studentId": row.student_id,
        "noticeId": row.notice_id,
        "title": row.title,
        "summary": row.summary,
        "batchId": row.batch_id,
        "channels": row.channels or [],
        "createdAt": dt_ms(row.created_at),
        "readAt": dt_ms(row.read_at),
    }


def application(row: Application) -> dict:
    return {
        "id": row.id,
        "studentId": row.student_id,
        "type": row.type,
        "subtype": row.subtype,
        "status": row.status,
        "createdAt": dt_ms(row.created_at),
        "form": row.form or {},
        "attachments": row.attachments or [],
        "teacherComment": row.teacher_comment,
        "decidedAt": dt_ms(row.decided_at),
        "auditTrail": row.audit_trail or [],
    }


def honor(row: Honor) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "winner": row.winner,
        "year": row.year,
        "major": row.major,
        "grade": row.grade,
        "category": row.category,
        "intro": row.intro,
    }


def party(row: PartyProgress) -> dict:
    return {"studentId": row.student_id, "currentKey": row.current_key, "history": row.history or [], "tasks": row.tasks or []}


def academic_plan(row: AcademicPlan | None) -> dict | None:
    if not row:
        return None
    return {"key": row.key, "grade": row.grade, "major": row.major, "modules": row.modules or []}


def academic_progress(row: AcademicProgress | None) -> dict | None:
    if not row:
        return None
    return {"studentId": row.student_id, "modules": row.modules or [], "uploads": row.uploads or []}


def batch(row: NoticeBatch) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "targetRule": row.target_rule or {},
        "createdAt": dt_ms(row.created_at),
        "channels": row.channels or [],
    }


def audit_log(row: AuditLog) -> dict:
    return {
        "id": row.id,
        "at": dt_ms(row.at),
        "actorId": row.actor_id,
        "role": row.role,
        "action": row.action,
        "target": row.target,
        "detail": row.detail or {},
    }
