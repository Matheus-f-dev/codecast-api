from fastapi import FastAPI

from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
