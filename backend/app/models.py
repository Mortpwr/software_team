from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    student_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    grade: Mapped[str] = mapped_column(String(32), nullable=False)
    major: Mapped[str] = mapped_column(String(128), nullable=False)
    class_name: Mapped[str] = mapped_column(String(64), nullable=False)
    nation: Mapped[str] = mapped_column(String(32), default="")
    phone: Mapped[str] = mapped_column(String(32), default="")
    political_status: Mapped[str] = mapped_column(String(64), default="")
    tutor: Mapped[str] = mapped_column(String(64), default="")
    hometown: Mapped[str] = mapped_column(String(128), default="")
    extension: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class KnowledgeItem(Base, TimestampMixin):
    __tablename__ = "knowledge_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    sensitive_hint: Mapped[bool] = mapped_column(Boolean, default=False)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    hit_count: Mapped[int] = mapped_column(Integer, default=0)
    online: Mapped[bool] = mapped_column(Boolean, default=True)


class TemplateFile(Base, TimestampMixin):
    __tablename__ = "template_files"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    scene: Mapped[str] = mapped_column(String(80), default="")
    format: Mapped[str] = mapped_column(String(20), default="")
    file_url: Mapped[str] = mapped_column(String(500), default="")


class Notice(Base, TimestampMixin):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(100), default="学院学工")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(32), index=True)
    notice_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    batch_id: Mapped[str] = mapped_column(String(64), index=True)
    channels: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Application(Base, TimestampMixin):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(32), index=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    subtype: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), index=True)
    form: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    teacher_comment: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    audit_trail: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)


class Honor(Base, TimestampMixin):
    __tablename__ = "honors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    winner: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int] = mapped_column(Integer, index=True)
    major: Mapped[str] = mapped_column(String(128), default="")
    grade: Mapped[str] = mapped_column(String(32), default="")
    category: Mapped[str] = mapped_column(String(64), default="")
    intro: Mapped[str] = mapped_column(Text, default="")


class PartyProgress(Base, TimestampMixin):
    __tablename__ = "party_progress"

    student_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    current_key: Mapped[str] = mapped_column(String(64), default="applicant")
    history: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    tasks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)


class AcademicPlan(Base, TimestampMixin):
    __tablename__ = "academic_plans"

    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    grade: Mapped[str] = mapped_column(String(32), index=True)
    major: Mapped[str] = mapped_column(String(128), index=True)
    modules: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)


class AcademicProgress(Base, TimestampMixin):
    __tablename__ = "academic_progress"

    student_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    modules: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    uploads: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)


class NoticeBatch(Base, TimestampMixin):
    __tablename__ = "notice_batches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    target_rule: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    channels: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    actor_id: Mapped[str] = mapped_column(String(64), default="")
    role: Mapped[str] = mapped_column(String(32), default="")
    action: Mapped[str] = mapped_column(String(100), default="")
    target: Mapped[str] = mapped_column(String(200), default="")
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
