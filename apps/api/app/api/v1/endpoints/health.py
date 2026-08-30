from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str
    version: str

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health() -> HealthResponse:
    """
    Check the health status of the API service.
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        service=settings.PROJECT_NAME,
        version=settings.VERSION
    )
