from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CODE Jr - DEV1"
    debug: bool = True
    database_url: str = "sqlite:///./dev1.db"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
