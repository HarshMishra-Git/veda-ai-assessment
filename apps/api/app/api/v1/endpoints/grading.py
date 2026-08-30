from fastapi import APIRouter, status
from app.schemas.grading import AssessmentGradingResponse
from app.services.grading_service import grading_service, grading_storage

router = APIRouter()

@router.post(
    "/{job_id}/grade",
    response_model=AssessmentGradingResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate and grade student answers using Gemini",
    description="Grades each mapped question against question text and allocated marks, generates pedagogical feedback, assigns verdicts (correct/partial/incorrect/unanswered), and computes overall assessment scores."
)
async def grade_assessment(job_id: str) -> AssessmentGradingResponse:
    return await grading_service.grade_assessment(job_id)

@router.get(
    "/{job_id}/grades",
    response_model=AssessmentGradingResponse,
    summary="Get cached grading results for a job"
)
async def get_grades(job_id: str) -> AssessmentGradingResponse:
    return grading_storage.get(job_id)
