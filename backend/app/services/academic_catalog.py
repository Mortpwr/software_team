"""官方培养方案目录：用于学业分析、课程地图与毕业要求展示。"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AcademicPlan


CS_2024_MODULES = [
    {
        "key": "ideology_required",
        "name": "思想政治理论课必修模块",
        "required": 19,
        "group": "通识模块",
        "requirement": "完成思想政治理论课必修模块全部课程。",
    },
    {
        "key": "ideology_elective",
        "name": "思想政治理论课选修模块",
        "required": 2,
        "group": "通识模块",
        "requirement": "在思想政治理论课选修模块选修 1 门课程。",
    },
    {
        "key": "basic_skills",
        "name": "基础技能",
        "required": 6,
        "group": "通识模块",
        "requirement": "普通班公共外语计 6 学分；大学英语实验班按对应培养方案执行。",
    },
    {
        "key": "public_pe",
        "name": "公共体育",
        "required": 4,
        "group": "通识模块",
        "requirement": "第一、二学年修读核心基础课与专项基础课，第三、四学年按体育培养方案继续修读。",
    },
    {
        "key": "general_courses",
        "name": "通识课程群",
        "required": 12,
        "group": "通识模块",
        "requirement": "通识核心课、一般通识课共 6 学分；新生研讨课 2 学分；美育 2 学分；心理健康教育 2 学分。",
    },
    {
        "key": "international_summer",
        "name": "国际暑期学校全英文课",
        "required": 2,
        "group": "通识模块",
        "requirement": "选修 2 学分国际暑期学校全英文课程。",
    },
    {
        "key": "category_common",
        "name": "部类共同课",
        "required": 22,
        "group": "专业模块",
        "requirement": "数学类 18 学分：高等数学 I/II、高等代数 I/II；普通物理 B 4 学分。",
        "courses": ["高等数学 I", "高等数学 II", "高等代数 I", "高等代数 II", "普通物理 B"],
    },
    {
        "key": "category_foundation",
        "name": "部类基础课",
        "required": 4,
        "group": "专业模块",
        "requirement": "完成《程序设计》课程。",
        "courses": ["程序设计"],
    },
    {
        "key": "major_core",
        "name": "专业核心课",
        "required": 46,
        "group": "专业模块",
        "requirement": "完成计算机科学与技术专业核心课程模块所有课程。",
        "tracks": ["数学进阶", "问题求解", "系统平台", "数据科学", "专业引领", "实践训练"],
    },
    {
        "key": "personalized_elective",
        "name": "个性化选修课",
        "required": 18,
        "group": "专业模块",
        "requirement": "实践课程 5 学分、模块限选 10 学分、个性化任选 3 学分；覆盖理论基础、系统与网络、人工智能/大数据/多媒体、信息安全等方向要求。",
    },
    {
        "key": "research_training",
        "name": "研究训练",
        "required": 2,
        "group": "创新训练与科学研究",
        "requirement": "参加“求是学术”品牌研究项目等相关项目或完成调研报告等。",
    },
    {
        "key": "professional_practice",
        "name": "专业实习",
        "required": 4,
        "group": "创新训练与科学研究",
        "requirement": "第一学年暑期完成《综合设计》2 学分；参与导师讨论班或前沿讲座并完成不少于 3000 字实习报告 2 学分。",
    },
    {
        "key": "thesis",
        "name": "毕业论文",
        "required": 4,
        "group": "创新训练与科学研究",
        "requirement": "第三学年春季完成《学术调研与论文写作》和开题报告；第四学年完成 15000 字以上毕业论文。",
    },
    {
        "key": "public_elective",
        "name": "公共选修课",
        "required": 2,
        "group": "素质拓展与发展指导",
        "requirement": "选修 2 学分公共选修课。",
    },
    {
        "key": "labor_education",
        "name": "劳动教育",
        "required": 1,
        "group": "素质拓展与发展指导",
        "requirement": "按学校劳动教育培养方案必修。",
    },
    {
        "key": "military",
        "name": "军事课",
        "required": 4,
        "group": "素质拓展与发展指导",
        "requirement": "按学校军事课培养方案必修。",
    },
    {
        "key": "career_planning",
        "name": "职业生涯规划",
        "required": 1,
        "group": "素质拓展与发展指导",
        "requirement": "按学校职业生涯规划课培养方案必修。",
    },
    {
        "key": "volunteer_service",
        "name": "志愿服务",
        "required": 2,
        "group": "素质拓展与发展指导",
        "requirement": "参与学校认可的志愿服务项目，总时长不少于 24 小时且总次数不少于 8 次。",
    },
]


CS_2024_COURSE_MAP = {
    "semesters": [f"第 {i} 学期" for i in range(1, 9)],
    "rows": [
        {
            "group": "部类核心课",
            "items": [
                {"term": 1, "name": "高等数学 I", "type": "category"},
                {"term": 1, "name": "高等代数 I", "type": "category"},
                {"term": 1, "name": "程序设计", "type": "category"},
                {"term": 2, "name": "高等数学 II", "type": "category"},
                {"term": 2, "name": "高等代数 II", "type": "category"},
                {"term": 4, "name": "普通物理 B", "type": "category"},
            ],
        },
        {
            "group": "专业核心课 · 数学进阶",
            "items": [
                {"term": 1, "name": "数学进阶", "type": "placeholder"},
                {"term": 2, "name": "离散数学", "type": "major"},
                {"term": 3, "name": "概率论与数理统计", "type": "major"},
            ],
        },
        {
            "group": "专业核心课 · 问题求解",
            "items": [
                {"term": 1, "name": "问题求解", "type": "placeholder"},
                {"term": 3, "name": "数据结构与算法 I", "type": "major"},
                {"term": 4, "name": "数据结构与算法 II", "type": "major"},
                {"term": 6, "name": "计算理论导论", "type": "major"},
            ],
        },
        {
            "group": "专业核心课 · 系统平台",
            "items": [
                {"term": 1, "name": "系统平台", "type": "placeholder"},
                {"term": 3, "name": "计算机系统基础 I", "type": "major"},
                {"term": 4, "name": "操作系统", "type": "major"},
                {"term": 5, "name": "并行计算", "type": "major"},
                {"term": 6, "name": "计算机网络", "type": "major"},
            ],
        },
        {
            "group": "专业核心课 · 数据科学",
            "items": [
                {"term": 1, "name": "数据科学", "type": "placeholder"},
                {"term": 3, "name": "数据科学导论", "type": "major"},
                {"term": 4, "name": "机器学习", "type": "major"},
                {"term": 5, "name": "数据库系统概论", "type": "major"},
                {"term": 6, "name": "编译原理", "type": "major"},
            ],
        },
        {
            "group": "专业核心课 · 专业引领",
            "items": [
                {"term": 1, "name": "专业引领", "type": "placeholder"},
                {"term": 3, "name": "网络空间安全引论", "type": "major"},
                {"term": 4, "name": "软件工程导论", "type": "major"},
            ],
        },
        {
            "group": "专业核心课 · 实践训练",
            "items": [
                {"term": 2, "name": "综合设计（暑期小学期）", "type": "practice"},
                {"term": 5, "name": "程序设计实践", "type": "practice"},
                {"term": 6, "name": "学术调研与论文写作", "type": "practice"},
                {"term": 7, "name": "专业实习", "type": "practice"},
                {"term": 8, "name": "毕业论文", "type": "practice"},
            ],
        },
    ],
    "bands": [
        {"group": "个性化选修", "text": "计算机类、人文类、法政与社会类、管理类、理工类、经济类"},
        {"group": "通识培养", "text": "思想政治理论课、基础技能、通识课程群、公共体育、国际暑期学校全英文课"},
        {"group": "创新训练与科学研究", "text": "研究训练、其他专业实践活动"},
        {"group": "素质拓展与发展指导", "text": "公共选修课、劳动教育、军事课、职业生涯规划、志愿服务"},
    ],
}


CS_2024_OVERVIEW = {
    "title": "计算机科学与技术专业 2024 级本科培养方案",
    "degree": "工学学士",
    "duration": "四年",
    "totalCredits": 155,
    "principle": "各类必修课程应按照培养方案中的开设学期修读，无特殊原因不提前、延后或乱序修读。",
    "objective": "培养具有扎实数学和计算机科学与技术基础，兼顾科学精神与人文素养，能从事计算机与信息系统设计、研发、应用、管理等工作的高素质复合型人才。",
}


CS_2024_GRADUATION_REQUIREMENTS = [
    "工程知识",
    "问题分析",
    "设计 / 开发解决方案",
    "研究",
    "使用现代工具",
    "工程与社会",
    "环境和可持续发展",
    "职业规范",
    "个人和团队",
    "沟通",
    "项目管理",
    "终身学习",
]


OFFICIAL_PLANS = [
    {
        "key": "2024级|计算机科学与技术",
        "grade": "2024级",
        "major": "计算机科学与技术",
        "modules": CS_2024_MODULES,
        "overview": CS_2024_OVERVIEW,
        "courseMap": CS_2024_COURSE_MAP,
        "graduationRequirements": CS_2024_GRADUATION_REQUIREMENTS,
    },
]


def official_plan_for(grade: str, major: str) -> dict | None:
    normalized_major = (major or "").strip()
    normalized_grade = (grade or "").strip()
    for plan in OFFICIAL_PLANS:
        if plan["grade"] == normalized_grade and plan["major"] == normalized_major:
            return plan
    return None


def default_official_plan() -> dict:
    return OFFICIAL_PLANS[0]


def ensure_academic_official_content(db: Session) -> None:
    for plan in OFFICIAL_PLANS:
        row = db.get(AcademicPlan, plan["key"])
        if not row:
            db.add(AcademicPlan(key=plan["key"], grade=plan["grade"], major=plan["major"], modules=plan["modules"]))


def enrich_plan_payload(payload: dict | None, grade: str = "", major: str = "") -> dict | None:
    if not payload:
        return None
    official = official_plan_for(payload.get("grade") or grade, payload.get("major") or major)
    if not official:
        return payload
    return {
        **payload,
        "modules": official["modules"],
        "overview": official["overview"],
        "courseMap": official["courseMap"],
        "graduationRequirements": official["graduationRequirements"],
    }


def official_reference_payload() -> dict:
    plan = default_official_plan()
    return {
        "key": plan["key"],
        "grade": plan["grade"],
        "major": plan["major"],
        "modules": plan["modules"],
        "overview": plan["overview"],
        "courseMap": plan["courseMap"],
        "graduationRequirements": plan["graduationRequirements"],
    }
