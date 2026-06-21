from fastapi import FastAPI

from app.controllers.host import router as host_router
from app.controllers.studio import router as studio_router
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

app.include_router(studio_router)
app.include_router(host_router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
