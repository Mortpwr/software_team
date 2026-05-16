from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.deps import CurrentSession, get_current_session

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/api/runtime")
def runtime() -> dict:
    settings = get_settings()
    return {
        "ok": True,
        "appName": settings.app_name,
        "env": settings.app_env,
        "authMode": settings.auth_mode,
        "tokenHours": settings.auth_token_hours,
        "maxUploadBytes": settings.max_upload_bytes,
        "autoCreateTables": settings.auto_create_tables,
    }


@router.get("/api/session")
def session_info(session: CurrentSession = Depends(get_current_session)) -> dict:
    return {
        "studentId": session.student_id,
        "role": session.role,
        "authMode": get_settings().auth_mode,
        "hasToken": bool(session.token),
    }
