"""Lightweight schema patches for existing databases (no Alembic)."""

from sqlalchemy import inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.models import Student
from app.services.academic_catalog import ensure_academic_official_content
from app.services.passwords import default_initial_password, hash_password
from app.services.party_bootstrap import ensure_party_official_content
from app.services.seed_data import STUDENTS
from app.services.scholarship_catalog import ensure_scholarship_catalog


def ensure_schema(engine: Engine) -> None:
    from app.db.session import Base

    # PostgreSQL remains the target database. create_all is intentionally kept
    # here as a no-op for existing tables and a safety net for newly added ones;
    # the ALTER patches below handle old tables that predate current models.
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "students" in tables:
            cols = {col["name"] for col in inspector.get_columns("students")}
            for col, ddl in (
                ("role", "ALTER TABLE students ADD COLUMN role VARCHAR(32) DEFAULT 'student'"),
                ("password_hash", "ALTER TABLE students ADD COLUMN password_hash VARCHAR(255) DEFAULT ''"),
                ("id_card_encrypted", "ALTER TABLE students ADD COLUMN id_card_encrypted VARCHAR(512) DEFAULT ''"),
                ("email", "ALTER TABLE students ADD COLUMN email VARCHAR(128) DEFAULT ''"),
            ):
                if col not in cols:
                    conn.execute(text(ddl))

        if "knowledge_items" in tables:
            cols = {col["name"] for col in inspector.get_columns("knowledge_items")}
            if "official_link" not in cols:
                conn.execute(text("ALTER TABLE knowledge_items ADD COLUMN official_link VARCHAR(500) DEFAULT ''"))

        if "honors" in tables:
            cols = {col["name"] for col in inspector.get_columns("honors")}
            if "visibility" not in cols:
                conn.execute(text("ALTER TABLE honors ADD COLUMN visibility VARCHAR(32) DEFAULT 'public'"))
            if "attachments" not in cols:
                conn.execute(text("ALTER TABLE honors ADD COLUMN attachments JSONB DEFAULT '[]'"))
            if "online" not in cols:
                conn.execute(text("ALTER TABLE honors ADD COLUMN online BOOLEAN DEFAULT TRUE"))

        if "academic_progress" in tables:
            cols = {col["name"] for col in inspector.get_columns("academic_progress")}
            if "courses" not in cols:
                conn.execute(text("ALTER TABLE academic_progress ADD COLUMN courses JSONB DEFAULT '[]'"))

        if "template_files" in tables:
            cols = {col["name"] for col in inspector.get_columns("template_files")}
            if "file_id" not in cols:
                conn.execute(text("ALTER TABLE template_files ADD COLUMN file_id VARCHAR(64) DEFAULT ''"))

        if "application_templates" in tables:
            cols = {col["name"] for col in inspector.get_columns("application_templates")}
            if "subtype" not in cols:
                conn.execute(text("ALTER TABLE application_templates ADD COLUMN subtype VARCHAR(64) DEFAULT ''"))

        for ddl in (
            "CREATE TABLE IF NOT EXISTS party_timeline_rules (stage_key VARCHAR(64) PRIMARY KEY, duration_days INTEGER DEFAULT 0, remind_before_days INTEGER DEFAULT 0, material TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS party_stages (stage_key VARCHAR(64) PRIMARY KEY, name VARCHAR(64) NOT NULL, description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS league_progress (student_id VARCHAR(32) PRIMARY KEY, current_key VARCHAR(64) DEFAULT 'l_apply', history JSONB DEFAULT '[]', tasks JSONB DEFAULT '[]', completed_steps JSONB DEFAULT '[]', verified_steps JSONB DEFAULT '[]', step_materials JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS league_timeline_rules (stage_key VARCHAR(64) PRIMARY KEY, duration_days INTEGER DEFAULT 0, remind_before_days INTEGER DEFAULT 0, material TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS knowledge_favorites (student_id VARCHAR(32) NOT NULL, item_id VARCHAR(64) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (student_id, item_id))",
            "CREATE TABLE IF NOT EXISTS knowledge_recent_views (id SERIAL PRIMARY KEY, student_id VARCHAR(32) NOT NULL, item_id VARCHAR(64) NOT NULL, viewed_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS theory_questions (id VARCHAR(64) PRIMARY KEY, stem TEXT NOT NULL, options JSONB DEFAULT '[]', answer VARCHAR(200) DEFAULT '', explanation TEXT DEFAULT '', category VARCHAR(64) DEFAULT '', online BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS theory_attempts (id VARCHAR(64) PRIMARY KEY, student_id VARCHAR(32), score INTEGER DEFAULT 0, total INTEGER DEFAULT 0, detail JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS application_templates (id VARCHAR(64) PRIMARY KEY, name VARCHAR(120) NOT NULL, apply_type VARCHAR(64) DEFAULT '', subtype VARCHAR(64) DEFAULT '', body_html TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS knowledge_miss_keywords (keyword VARCHAR(200) PRIMARY KEY, count INTEGER DEFAULT 1, last_student_id VARCHAR(32) DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS sms_simulations (id VARCHAR(64) PRIMARY KEY, batch_id VARCHAR(64), student_id VARCHAR(32), phone_masked VARCHAR(32) DEFAULT '', text TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS party_calendar_events (id VARCHAR(64) PRIMARY KEY, event_date VARCHAR(16) DEFAULT '', title VARCHAR(200) DEFAULT '', note TEXT DEFAULT '', tags JSONB DEFAULT '[]', online BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",
        ):
            conn.execute(text(ddl))

        inspector = inspect(conn)
        tables = set(inspector.get_table_names())

        if "party_progress" in tables:
            cols = {col["name"] for col in inspector.get_columns("party_progress")}
            if "completed_steps" not in cols:
                conn.execute(text("ALTER TABLE party_progress ADD COLUMN completed_steps JSONB DEFAULT '[]'"))
            if "verified_steps" not in cols:
                conn.execute(text("ALTER TABLE party_progress ADD COLUMN verified_steps JSONB DEFAULT '[]'"))
            if "step_materials" not in cols:
                conn.execute(text("ALTER TABLE party_progress ADD COLUMN step_materials JSONB DEFAULT '{}'"))
            if "thought_reports" not in cols:
                conn.execute(text("ALTER TABLE party_progress ADD COLUMN thought_reports JSONB DEFAULT '[]'"))

        if "league_progress" in tables:
            cols = {col["name"] for col in inspector.get_columns("league_progress")}
            if "verified_steps" not in cols:
                conn.execute(text("ALTER TABLE league_progress ADD COLUMN verified_steps JSONB DEFAULT '[]'"))
            if "step_materials" not in cols:
                conn.execute(text("ALTER TABLE league_progress ADD COLUMN step_materials JSONB DEFAULT '{}'"))

    backfill_student_defaults(engine)
    sync_party_official_content(engine)
    sync_academic_official_content(engine)
    sync_scholarship_catalog(engine)


def sync_party_official_content(engine: Engine) -> None:
    with Session(engine) as db:
        ensure_party_official_content(db)


def sync_academic_official_content(engine: Engine) -> None:
    with Session(engine) as db:
        ensure_academic_official_content(db)
        db.commit()


def sync_scholarship_catalog(engine: Engine) -> None:
    with Session(engine) as db:
        ensure_scholarship_catalog(db)
        db.commit()


def backfill_student_defaults(engine: Engine) -> None:
    from sqlalchemy.orm import Session

    seeded_roles = {sid: role for sid, role, *_ in STUDENTS}

    with Session(engine) as db:
        changed = False
        rows = db.scalars(select(Student)).all()
        for row in rows:
            role = (row.role or "").strip()
            if row.student_id in seeded_roles and role in {"", "student"}:
                row.role = seeded_roles[row.student_id]
                changed = True
            elif not role:
                row.role = "student"
                changed = True
            if row.password_hash == "":
                row.password_hash = hash_password(default_initial_password(row.student_id))
                changed = True
        if changed:
            db.commit()


def main() -> None:
    from app.db.session import engine

    ensure_schema(engine)
    print("schema migration ok")


if __name__ == "__main__":
    main()
