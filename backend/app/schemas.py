from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SessionInfo(BaseModel):
    student_id: str = Field(alias="studentId")
    role: str = "student"


class ApplicationCreate(BaseModel):
    type: str
    subtype: str = ""
    form: dict[str, Any] = Field(default_factory=dict)
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    remark: str = ""


class ApplicationDecision(BaseModel):
    comment: str = ""
    reason: str = ""
    new_status: str = Field(default="", alias="newStatus")


class NoticePublish(BaseModel):
    title: str
    summary: str = ""
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    target_rule: dict[str, Any] = Field(default_factory=lambda: {"kind": "all"}, alias="targetRule")
    source: str = "管理老师"


class AcademicProgressPut(BaseModel):
    modules: list[dict[str, Any]] = Field(default_factory=list)


class TranscriptMetaCreate(BaseModel):
    meta: dict[str, Any] = Field(default_factory=dict)


class KnowledgeCreate(BaseModel):
    title: str
    category: str
    tags: list[str] = Field(default_factory=list)
    summary: str
    body: str = ""
    sensitive_hint: bool = Field(default=False, alias="sensitiveHint")


class ApiMessage(BaseModel):
    ok: bool = True
    message: str = ""
    data: Any | None = None


def ms(dt: datetime | None) -> int | None:
    if not dt:
        return None
    return int(dt.timestamp() * 1000)
