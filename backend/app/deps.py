from dataclasses import dataclass

from fastapi import Header


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
    return CurrentSession(student_id=x_student_id, role=x_role, token=token)
