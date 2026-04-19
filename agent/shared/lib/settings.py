"""Shared settings loaded from .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    claude_api_key: str
    supabase_url: str
    supabase_secret_key: str
    supabase_db_url: str
    resend_api_key: str
    digest_from_email: str
    digest_from_name: str = "Job Agent"
    agent_version: str = "v1"
    log_level: str = "INFO"


settings = Settings()
