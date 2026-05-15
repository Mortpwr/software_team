from functools import lru_cache
import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        load_dotenv()
        self.app_name = os.getenv("APP_NAME", "学院学生综合服务与党团管理平台")
        self.app_env = os.getenv("APP_ENV", "dev")
        self.database_url = os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/student_service",
        )
        self.cors_origins = os.getenv("CORS_ORIGINS", "http://127.0.0.1:5177,http://localhost:5177")
        self.auto_create_tables = os.getenv("AUTO_CREATE_TABLES", "false").lower() in {"1", "true", "yes"}
        self.upload_dir = os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parents[2] / "storage" / "uploads"))
        self.max_upload_bytes = int(os.getenv("MAX_UPLOAD_BYTES", str(30 * 1024 * 1024)))

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


def load_dotenv() -> None:
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[2] / ".env",
    ]
    path = next((item for item in candidates if item.exists()), None)
    if path is None:
        return
    with path.open("r", encoding="utf-8") as fp:
        for line in fp:
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            key, value = raw.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
