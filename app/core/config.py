from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "CODE Jr - DEV1"
    debug: bool = True
    database_url: str = "sqlite:///./dev1.db"

    class Config:
        env_file = ".env"


settings = Settings()
