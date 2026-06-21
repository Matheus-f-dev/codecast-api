from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from app.controllers.booking import router as booking_router
from app.controllers.host import router as host_router
from app.controllers.studio import router as studio_router
from app.core.config import settings
from app.core.exceptions import BookingConflictError

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)


@app.exception_handler(BookingConflictError)
def booking_conflict_handler(request: Request, exc: BookingConflictError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})

app.include_router(studio_router)
app.include_router(host_router)
app.include_router(booking_router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
