from fastapi import APIRouter, status
from app.schemas.mapping import AssessmentMappingResponse
from app.services.mapping_service import mapping_service, mapping_storage

router = APIRouter()

@router.post(
    "/{job_id}/map-qa",
    response_model=AssessmentMappingResponse,
    status_code=status.HTTP_200_OK,
    summary="Map extracted questions to handwritten student answers",
    description="Combines question paper questions and handwritten student answers using deterministic label matching and Gemini semantic fallback. Preserves multi-page answer coordinates, separates subquestions 11(a)/11(b), and flags unanswered/unmatched items."
)
async def map_questions_and_answers(job_id: str) -> AssessmentMappingResponse:
    return await mapping_service.map_questions_and_answers(job_id)

@router.get(
    "/{job_id}/mapping",
    response_model=AssessmentMappingResponse,
    summary="Get cached Question-Answer mapping for a job"
)
async def get_mapping_result(job_id: str) -> AssessmentMappingResponse:
    return mapping_storage.get(job_id)
