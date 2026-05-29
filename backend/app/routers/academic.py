import csv

from datetime import datetime, timezone

from io import StringIO



from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from sqlalchemy import select

from sqlalchemy.orm import Session



from app.db.session import get_db

from app.deps import CurrentSession, get_current_session

from app.models import AcademicPlan, AcademicProgress, Student

from app.schemas import AcademicPlanPut, AcademicProgressPut, TranscriptMetaCreate

from app.services.academic_catalog import enrich_plan_payload, official_reference_payload
from app.services.common import audit

from app.services.serializers import academic_plan, academic_progress

from app.services.transcript_parser import course_suggestions, parse_transcript_pdf



router = APIRouter(prefix="/academic", tags=["academic"])





@router.get("/plan")

def plan(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    student = db.get(Student, session.student_id)

    if not student:

        raise HTTPException(status_code=404, detail="student not found")

    key = f"{student.grade}|{student.major}"

    plan_payload = enrich_plan_payload(academic_plan(db.get(AcademicPlan, key)), student.grade, student.major)
    response = {"plan": plan_payload, "progress": academic_progress(db.get(AcademicProgress, session.student_id))}
    if plan_payload and not plan_payload.get("courseMap"):
        response["referencePlan"] = official_reference_payload()
    return response





@router.get("/report")

def report(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    payload = plan(db, session)

    plan_row = payload["plan"]

    progress_row = payload["progress"]

    if not plan_row or not progress_row:

        return {
            "ok": False,
            "message": "缺少培养方案或学业进度。",
            "hint": "请先让管理老师维护培养方案，再上传成绩单或手动录入模块学分。",
        }
    progress_by_key = {item["key"]: item for item in progress_row["modules"]}

    modules = []

    for item in plan_row["modules"]:

        earned = float(progress_by_key.get(item["key"], {}).get("earned", 0))

        gap = max(0, float(item["required"]) - earned)

        modules.append({**item, "earned": earned, "gap": gap, "risk": "高" if gap >= 4 else "中" if gap >= 2 else "低"})

    gap_items = [m for m in modules if m["gap"] > 0]
    total_required = round(sum(float(item.get("required", 0) or 0) for item in modules), 1)
    total_earned = round(sum(float(item.get("earned", 0) or 0) for item in modules), 1)
    total_gap = round(max(0, total_required - total_earned), 1)

    return {

        "ok": True,

        "modules": modules,
        "moduleGroups": module_groups(modules),
        "overview": plan_row.get("overview"),
        "courseMap": plan_row.get("courseMap"),
        "graduationRequirements": plan_row.get("graduationRequirements", []),
        "referencePlan": official_reference_payload() if not plan_row.get("courseMap") else None,
        "totalRequired": total_required,
        "totalEarned": total_earned,
        "totalGap": total_gap,

        "riskLevel": "高" if any(m["risk"] == "高" for m in modules) else "中" if any(m["risk"] == "中" for m in modules) else "低",

        "suggestions": course_suggestions(gap_items),

        "uploads": progress_row["uploads"],

        "courses": progress_row.get("courses", []),

        "warning": "存在明显毕业风险，请尽快补修相关模块。" if any(m["risk"] == "高" for m in modules) else "",

    }





@router.put("/progress")

def put_progress(payload: AcademicProgressPut, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    row = db.get(AcademicProgress, session.student_id)

    if not row:

        row = AcademicProgress(student_id=session.student_id)

        db.add(row)

    row.modules = payload.modules

    audit(db, session, "academic_progress_put", session.student_id)

    db.commit()

    return {"ok": True}





@router.post("/transcript")

def transcript_meta(payload: TranscriptMetaCreate, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    row = db.get(AcademicProgress, session.student_id)

    if not row:

        raise HTTPException(status_code=404, detail="academic progress not found")

    row.uploads = [{"at": int(datetime.now(timezone.utc).timestamp() * 1000), **payload.meta}, *(row.uploads or [])]

    audit(db, session, "academic_transcript_meta", session.student_id, payload.meta)

    db.commit()

    return {"ok": True}





@router.post("/transcript/upload")

async def upload_transcript(

    file: UploadFile = File(...),

    confirm: bool = Form(default=False),

    db: Session = Depends(get_db),

    session: CurrentSession = Depends(get_current_session),

) -> dict:

    if not (file.filename or "").lower().endswith(".pdf"):

        raise HTTPException(status_code=400, detail="only pdf transcript supported")

    raw = await file.read()

    student = db.get(Student, session.student_id)

    plan = db.get(AcademicPlan, f"{student.grade}|{student.major}") if student else None

    plan_modules = (plan.modules or []) if plan else []



    row = db.get(AcademicProgress, session.student_id)

    if not row:

        row = AcademicProgress(student_id=session.student_id, modules=[], uploads=[], courses=[])

        db.add(row)



    parsed = parse_transcript_pdf(raw, plan_modules)

    upload_meta = {

        "name": file.filename,

        "size": len(raw),

        "at": int(datetime.now(timezone.utc).timestamp() * 1000),

        "parseOk": parsed["ok"],

        "parseMessage": parsed.get("message", ""),

        "courseCount": len(parsed.get("courses", [])),

        "parseSource": parsed.get("parseSource", ""),
    }

    row.uploads = [upload_meta, *(row.uploads or [])]



    if parsed.get("courses"):

        row.courses = parsed["courses"]

    if confirm and parsed.get("modules"):

        merged = {item["key"]: item for item in row.modules or []}

        for item in parsed["modules"]:

            merged[item["key"]] = {"key": item["key"], "earned": item.get("earned", merged.get(item["key"], {}).get("earned", 0))}

        row.modules = list(merged.values())



    audit(db, session, "academic_transcript_upload", session.student_id, {"parseOk": parsed["ok"], "confirm": confirm})

    db.commit()

    return {

        "ok": parsed["ok"],

        "upload": upload_meta,

        "message": parsed.get("message", ""),

        "courses": parsed.get("courses", []),

        "suggestedModules": parsed.get("modules", []),

        "warnings": parsed.get("warnings", []),
        "parseSource": parsed.get("parseSource", ""),
        "modules": row.modules,

        "needsConfirm": parsed["ok"] and not confirm,

    }





@router.get("/workbench/plans")

def list_plans(db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    if session.role not in {"teacher", "leader"}:

        raise HTTPException(status_code=403, detail="forbidden")

    rows = db.scalars(select(AcademicPlan).order_by(AcademicPlan.grade.desc(), AcademicPlan.major)).all()

    return {"list": [academic_plan(row) for row in rows]}





@router.put("/workbench/plans")

def save_plan(payload: AcademicPlanPut, db: Session = Depends(get_db), session: CurrentSession = Depends(get_current_session)) -> dict:

    if session.role != "teacher":

        raise HTTPException(status_code=403, detail="forbidden")

    modules = normalize_modules(payload.modules)

    key = f"{payload.grade}|{payload.major}"

    row = db.get(AcademicPlan, key)

    if not row:

        row = AcademicPlan(key=key, grade=payload.grade, major=payload.major, modules=modules)

        db.add(row)

    else:

        row.grade = payload.grade

        row.major = payload.major

        row.modules = modules

    audit(db, session, "academic_plan_save", key, {"modules": len(modules)})

    db.commit()

    return academic_plan(row)





@router.post("/workbench/plans/import")

async def import_plans(

    file: UploadFile = File(...),

    dry_run: bool = Form(default=True, alias="dryRun"),

    db: Session = Depends(get_db),

    session: CurrentSession = Depends(get_current_session),

) -> dict:

    if session.role != "teacher":

        raise HTTPException(status_code=403, detail="forbidden")

    rows = parse_plan_csv((await file.read()).decode("utf-8-sig"))

    errors = validate_plan_rows(rows)

    plans = group_plan_rows(rows) if not errors else []

    if dry_run or errors:

        return {"ok": not errors, "dryRun": True, "total": len(rows), "plans": plans, "errors": errors}

    saved = []

    for item in plans:

        saved.append(save_plan(AcademicPlanPut(**item), db, session))

    audit(db, session, "academic_plan_import", file.filename or "academic_plans.csv", {"plans": len(saved)})

    db.commit()

    return {"ok": True, "dryRun": False, "total": len(rows), "plans": saved, "errors": []}





def normalize_modules(modules: list[dict]) -> list[dict]:

    result = []

    seen = set()

    for item in modules:

        key = str(item.get("key", "")).strip()

        name = str(item.get("name", "")).strip()

        if not key or not name or key in seen:

            continue

        seen.add(key)

        normalized = {
            "key": key,
            "name": name,
            "required": float(item.get("required", 0) or 0),
        }
        for extra in ("group", "requirement", "courses", "tracks"):
            if extra in item:
                normalized[extra] = item[extra]
        result.append(normalized)

    return result


def module_groups(modules: list[dict]) -> list[dict]:
    grouped: dict[str, dict] = {}
    for item in modules:
        group = str(item.get("group") or "其他").strip() or "其他"
        bucket = grouped.setdefault(group, {"name": group, "required": 0.0, "earned": 0.0, "gap": 0.0, "modules": []})
        bucket["modules"].append(item)
        bucket["required"] += float(item.get("required", 0) or 0)
        bucket["earned"] += float(item.get("earned", 0) or 0)
        bucket["gap"] += float(item.get("gap", 0) or 0)
    return [
        {
            **item,
            "required": round(item["required"], 1),
            "earned": round(item["earned"], 1),
            "gap": round(item["gap"], 1),
            "risk": "高" if any(m.get("risk") == "高" for m in item["modules"]) else "中" if any(m.get("risk") == "中" for m in item["modules"]) else "低",
        }
        for item in grouped.values()
    ]





def parse_plan_csv(text: str) -> list[dict]:

    reader = csv.DictReader(StringIO(text))

    rows = []

    for index, row in enumerate(reader, start=2):

        rows.append(

            {

                "row": index,

                "grade": str(row.get("年级") or row.get("grade") or "").strip(),

                "major": str(row.get("专业") or row.get("major") or "").strip(),

                "key": str(row.get("模块key") or row.get("key") or "").strip(),

                "name": str(row.get("模块名称") or row.get("name") or "").strip(),

                "required": str(row.get("要求学分") or row.get("required") or "").strip(),

            },

        )

    return rows





def validate_plan_rows(rows: list[dict]) -> list[dict]:

    errors = []

    seen = set()

    for row in rows:

        missing = [field for field in ["grade", "major", "key", "name", "required"] if not row.get(field)]

        if missing:

            errors.append({"row": row["row"], "field": ",".join(missing), "message": "必填字段缺失"})

            continue

        try:

            float(row["required"])

        except ValueError:

            errors.append({"row": row["row"], "field": "required", "message": "要求学分必须是数字"})

            continue

        dedup_key = (row["grade"], row["major"], row["key"])

        if dedup_key in seen:

            errors.append({"row": row["row"], "field": "key", "message": "同一培养方案内模块 key 重复"})

            continue

        seen.add(dedup_key)

    return errors





def group_plan_rows(rows: list[dict]) -> list[dict]:

    grouped: dict[str, dict] = {}

    for row in rows:

        key = f"{row['grade']}|{row['major']}"

        grouped.setdefault(key, {"grade": row["grade"], "major": row["major"], "modules": []})

        grouped[key]["modules"].append({"key": row["key"], "name": row["name"], "required": float(row["required"])})

    return list(grouped.values())
