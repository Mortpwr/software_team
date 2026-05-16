from dataclasses import dataclass

from fastapi import Header, HTTPException

from app.core.config import get_settings
from app.services.auth_tokens import verify_token


@dataclass(frozen=True)
class CurrentSession:
    student_id: str
    role: str
    token: str = ""


def get_current_session(
    x_student_id: str = Header(default="2024201581"),
    x_role: str = Header(default="student"),
    authorization: str = Header(default=""),
) -> CurrentSession:
    # 后续接微信登录/统一认证时，只替换这里，业务路由不需要感知认证细节。
    token = authorization.removeprefix("Bearer ").strip()
    payload = verify_token(token)
    if payload:
        return CurrentSession(student_id=payload["studentId"], role=payload["role"], token=token)
    if get_settings().auth_mode == "token":
        raise HTTPException(status_code=401, detail="invalid or missing token")
    return CurrentSession(student_id=x_student_id, role=x_role, token=token)
