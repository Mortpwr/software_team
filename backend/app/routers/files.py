import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.deps import CurrentSession, get_current_session
from app.models import TemplateFile
from app.services.common import audit, uid

router = APIRouter(tags=["files"])

BLOCKED_SUFFIXES = {".exe", ".bat", ".cmd", ".sh", ".js", ".msi"}


def storage_root() -> Path:
    root = Path(get_settings().upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def safe_suffix(filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix in BLOCKED_SUFFIXES:
        raise HTTPException(status_code=400, detail="unsupported file type")
    return suffix


def meta_path(file_id: str) -> Path:
    return storage_root() / f"{file_id}.json"


def data_path(file_id: str, suffix: str) -> Path:
    return storage_root() / f"{file_id}{suffix}"


@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    business: str = Form(default="general"),
    db: Session = Depends(get_db),
    session: CurrentSession = Depends(get_current_session),
) -> dict:
    suffix = safe_suffix(file.filename or "")
    file_id = uid("file")
    target = data_path(file_id, suffix)
    size = 0
    max_size = get_settings().max_upload_bytes
    with target.open("wb") as fp:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_size:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="file exceeds 30MB limit")
            fp.write(chunk)

    meta = {
        "id": file_id,
        "name": file.filename or f"{file_id}{suffix}",
        "size": size,
        "contentType": file.content_type or "application/octet-stream",
        "business": business,
        "suffix": suffix,
        "url": f"/api/files/{file_id}/download",
        "uploadedAt": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    meta_path(file_id).write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    audit(db, session, "file_upload", file_id, {"business": business, "size": size})
    db.commit()
    return meta


@router.get("/files/{file_id}/download")
def download_file(file_id: str, session: CurrentSession = Depends(get_current_session)) -> FileResponse:
    meta_file = meta_path(file_id)
    if not meta_file.exists():
        raise HTTPException(status_code=404, detail="file not found")
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    target = data_path(file_id, meta.get("suffix", ""))
    if not target.exists():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(target, media_type=meta.get("contentType") or "application/octet-stream", filename=meta.get("name") or target.name)


@router.get("/templates/{template_id}/download")
def download_template(template_id: str, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> Response:
    row = db.get(TemplateFile, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="template not found")
    body = (
        f"{row.name}\n\n"
        f"适用场景：{row.scene or '通用'}\n"
        "当前为课程演示环境生成的模板占位文件；正式部署后可替换为真实 Word/Excel/PDF 模板文件。\n"
    )
    audit(db, session, "template_download", template_id)
    db.commit()
    filename = f"{row.name}.{row.format or 'txt'}"
    return Response(
        body.encode("utf-8"),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
