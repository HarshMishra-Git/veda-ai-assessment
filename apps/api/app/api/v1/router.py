from fastapi import APIRouter
from app.api.v1.endpoints import health, documents, questions, answers, mapping, grading

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(questions.router, prefix="/documents", tags=["Questions"])
api_router.include_router(answers.router, prefix="/documents", tags=["Answers"])
api_router.include_router(mapping.router, prefix="/documents", tags=["Mapping"])
api_router.include_router(grading.router, prefix="/documents", tags=["Grading"])
