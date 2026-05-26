import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py is at apps/api/app/config.py -> go 3 levels up to reach root
current_dir = os.path.dirname(os.path.abspath(__file__))
root_env_path = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".env"))


class Settings(BaseSettings):
    app_env: str = "local"
    backend_cors_origins: str = "http://localhost:3000"
    openai_api_key: str | None = None
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ai_diary"

    model_config = SettingsConfigDict(
        env_file=root_env_path,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
