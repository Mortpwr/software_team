"""PDF 成绩单解析：提取课程名、类别、学分、成绩，并汇总到培养方案模块。"""

from __future__ import annotations

import re
from io import BytesIO

# 课程类别关键词 → 培养方案模块 key
CATEGORY_MAP = {
    "思想政治理论": "ideology_required",
    "思政": "ideology_required",
    "通识必修": "gen_req",
    "通识": "gen_req",
    "公共必修": "gen_req",
    "公共外语": "basic_skills",
    "外语": "basic_skills",
    "英语": "basic_skills",
    "体育": "public_pe",
    "国际暑期": "international_summer",
    "部类共同": "category_common",
    "部类基础": "category_foundation",
    "专业核心": "major_core",
    "专业必修": "major_core",
    "个性化选修": "personalized_elective",
    "专业选修": "major_ele",
    "选修": "major_ele",
    "实践": "practice",
    "实习": "practice",
    "实验": "practice",
    "研究训练": "research_training",
    "毕业论文": "thesis",
    "军事": "military",
    "劳动": "labor_education",
    "职业生涯": "career_planning",
    "志愿服务": "volunteer_service",
}

COURSE_MODULE_OVERRIDES = {
    "高等数学": "category_common",
    "高等代数": "category_common",
    "普通物理": "category_common",
    "程序设计": "category_foundation",
    "离散数学": "major_core",
    "概率论与数理统计": "major_core",
    "数据结构与算法": "major_core",
    "计算理论导论": "major_core",
    "计算机系统基础": "major_core",
    "操作系统": "major_core",
    "并行计算": "major_core",
    "计算机网络": "major_core",
    "数据科学导论": "major_core",
    "机器学习": "major_core",
    "数据库系统概论": "major_core",
    "编译原理": "major_core",
    "网络空间安全引论": "major_core",
    "软件工程导论": "major_core",
    "综合设计": "professional_practice",
    "程序设计实践": "personalized_elective",
    "学术调研与论文写作": "thesis",
    "专业实习": "professional_practice",
    "毕业论文": "thesis",
}

# 行模式：课程名 + 类别/性质 + 学分 + 成绩
LINE_PATTERNS = [
    re.compile(
        r"^(.{2,30}?)\s+(?:[\u4e00-\u9fff]{2,8}\s+)?"
        r"(通识必修|通识选修|专业核心|专业必修|专业选修|公共必修|选修|实践|实习)\s+"
        r"(\d+(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?|优|良|中|及格|不及格|通过|免修)?",
    ),
    re.compile(r"^(.{2,30}?)\s+(\d+(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?|优|良|中|及格|不及格|通过)$"),
]


def parse_transcript_pdf(raw: bytes, plan_modules: list[dict] | None = None) -> dict:
    try:
        import pdfplumber
    except ImportError:
        return {"ok": False, "message": "缺少 pdfplumber 依赖", "courses": [], "modules": []}

    try:
        text_parts: list[str] = []
        table_rows: list[list[str]] = []
        with pdfplumber.open(BytesIO(raw)) as pdf:
            for page in pdf.pages:
                text_parts.append(page.extract_text() or "")
                for table in page.extract_tables() or []:
                    for row in table:
                        if row and any(cell and str(cell).strip() for cell in row):
                            table_rows.append([str(c or "").strip() for c in row])

        text = normalize_text("\n".join(text_parts))
        courses = parse_courses_from_tables(table_rows)
        parse_source = "table"
        if not courses:
            courses = parse_courses_from_text(text)
            parse_source = "text"
        if not courses:
            ocr_text = try_ocr_text(raw)
            if ocr_text:
                courses = parse_courses_from_text(normalize_text(ocr_text))
                parse_source = "ocr"

        courses = deduplicate_courses(courses)

        if not courses:
            return {
                "ok": False,
                "message": "未能识别课程行。请使用文本版 PDF，或安装 Tesseract/pdf2image 后重试 OCR，也可手动维护学分",
                "courses": [],
                "modules": [],
                "warnings": ["当前文件可能是扫描版、导出格式过于复杂，或课程表格文字无法被直接提取。"],
            }

        module_totals = aggregate_modules(courses, plan_modules or [])
        warnings = []
        if not plan_modules:
            warnings.append("当前未匹配到培养方案，只能先按课程类别粗略汇总学分。")
        if parse_source == "ocr":
            warnings.append("当前结果来自 OCR 识别，请重点核对课程名称和学分。")
        return {
            "ok": True,
            "message": f"已通过{parse_source.upper()}识别 {len(courses)} 门课程，请核对后保存",
            "courses": courses,
            "modules": module_totals,
            "parseSource": parse_source,
            "warnings": warnings,
        }
    except Exception as exc:
        return {"ok": False, "message": f"解析失败：{exc}", "courses": [], "modules": []}


def parse_courses_from_tables(rows: list[list[str]]) -> list[dict]:
    courses: list[dict] = []
    header_idx = detect_header(rows)
    for row in rows[header_idx + 1 :]:
        if len(row) < 3:
            continue
        joined = " ".join(row)
        if re.search(r"合计|总计|GPA|平均", joined):
            continue
        course = row_to_course(row)
        if course:
            courses.append(course)
    return courses


def detect_header(rows: list[list[str]]) -> int:
    for i, row in enumerate(rows):
        joined = "".join(row)
        if re.search(r"课程|科目|学分|成绩", joined):
            return i
    return -1


def row_to_course(row: list[str]) -> dict | None:
    row = [normalize_text(cell) for cell in row]
    name = row[0] if row else ""
    if not name or len(name) < 2 or re.match(r"^\d+$", name):
        return None

    category = ""
    credit = 0.0
    score = ""

    for cell in row[1:]:
        if not cell:
            continue
        if any(k in cell for k in CATEGORY_MAP) and not category:
            category = cell
        elif cell in {"优", "良", "中", "及格", "不及格", "通过", "免修"}:
            score = cell
        elif re.match(r"^\d+(?:\.\d+)?$", cell):
            val = float(cell)
            if val <= 6 and credit == 0:
                credit = val
            elif val <= 100:
                score = cell

    if credit <= 0:
        return None

    module_key = map_category(category, name)
    return {
        "name": name.strip(),
        "category": category or infer_category(name),
        "moduleKey": module_key,
        "credit": credit,
        "score": score,
    }


def parse_courses_from_text(text: str) -> list[dict]:
    courses: list[dict] = []
    for line in text.splitlines():
        line = normalize_text(line).strip()
        if not line or len(line) < 4:
            continue
        if re.search(r"合计|总计|学年|学期|GPA", line):
            continue
        for pattern in LINE_PATTERNS:
            m = pattern.match(line)
            if not m:
                continue
            groups = m.groups()
            if len(groups) == 4:
                name, cat, credit_s, score = groups
                category = cat
            else:
                name, credit_s, score = groups
                category = infer_category(name)
            try:
                credit = float(credit_s)
            except ValueError:
                continue
            if credit <= 0 or credit > 20:
                continue
            courses.append(
                {
                    "name": name.strip(),
                    "category": category,
                    "moduleKey": map_category(category, name),
                    "credit": credit,
                    "score": score or "",
                },
            )
            break
    return courses


def normalize_text(text: str) -> str:
    return (
        str(text or "")
        .replace("\u3000", " ")
        .replace("\xa0", " ")
        .replace("（", "(")
        .replace("）", ")")
        .replace("：", ":")
    )


def deduplicate_courses(courses: list[dict]) -> list[dict]:
    seen: set[tuple[str, str, float]] = set()
    result: list[dict] = []
    for item in courses:
        key = (
            str(item.get("name", "")).strip(),
            str(item.get("moduleKey", "")).strip(),
            round(float(item.get("credit", 0) or 0), 2),
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def infer_category(name: str) -> str:
    if re.search(r"实验|实习|实践|实训", name):
        return "实践"
    if re.search(r"选修", name):
        return "专业选修"
    if re.search(r"英语|体育|思政|马原|近代史", name):
        return "通识必修"
    return "专业核心"


def map_category(category: str, name: str) -> str:
    for keyword, key in COURSE_MODULE_OVERRIDES.items():
        if keyword in (name or ""):
            return key
    for keyword, key in CATEGORY_MAP.items():
        if keyword in (category or "") or keyword in (name or ""):
            return key
    return infer_category(name) == "通识必修" and "gen_req" or (
        infer_category(name) == "实践" and "practice" or "major_core"
    )


def aggregate_modules(courses: list[dict], plan_modules: list[dict]) -> list[dict]:
    totals: dict[str, float] = {}
    for c in courses:
        key = c.get("moduleKey") or "major_core"
        totals[key] = totals.get(key, 0) + float(c.get("credit", 0))

    plan_keys = {m.get("key") for m in plan_modules}
    if plan_keys:
        normalized_totals: dict[str, float] = {}
        for key, value in totals.items():
            target = normalize_module_key_for_plan(key, plan_keys)
            if target:
                normalized_totals[target] = normalized_totals.get(target, 0) + value
        return [{"key": k, "earned": round(v, 1)} for k, v in normalized_totals.items()]

    return [{"key": k, "earned": round(v, 1)} for k, v in totals.items()]


def normalize_module_key_for_plan(key: str, plan_keys: set[str]) -> str:
    if key in plan_keys:
        return key
    aliases = {
        "gen_req": "general_courses",
        "gen_ele": "general_courses",
        "major_ele": "personalized_elective",
        "practice": "professional_practice",
    }
    target = aliases.get(key, "")
    if target in plan_keys:
        return target
    return ""


def course_suggestions(gaps: list[dict]) -> list[dict]:
    hints = {
        "gen_req": "通识必修类课程（如思政、英语、体育）",
        "gen_ele": "通识选修类课程",
        "major_core": "专业核心必修课程",
        "major_ele": "专业选修课程",
        "practice": "实践、实习、实训类课程",
    }
    return [
        {
            "focus": item.get("name", item.get("key", "")),
            "hint": f"建议优先选修：{hints.get(item.get('key', ''), '相关模块课程')}",
            "gap": item.get("gap", 0),
        }
        for item in gaps
        if item.get("gap", 0) > 0
    ]


def try_ocr_text(raw: bytes) -> str:
    """扫描版 PDF 可选 OCR：需本机安装 Tesseract 与 pdf2image/poppler。"""
    try:
        import pytesseract
        from pdf2image import convert_from_bytes
    except ImportError:
        return ""

    try:
        images = convert_from_bytes(raw, dpi=200, first_page=1, last_page=3)
        chunks = [pytesseract.image_to_string(img, lang="chi_sim+eng") for img in images]
        return "\n".join(chunks)
    except Exception:
        return ""
