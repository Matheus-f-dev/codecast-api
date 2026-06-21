from fastapi import FastAPI

from app.controllers.booking import router as booking_router
from app.controllers.host import router as host_router
from app.controllers.studio import router as studio_router
from app.core.config import settings
from app.middlewares.error_handler import register_error_handlers

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

register_error_handlers(app)

app.include_router(studio_router)
app.include_router(host_router)
app.include_router(booking_router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
