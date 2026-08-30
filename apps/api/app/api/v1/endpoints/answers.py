from fastapi import APIRouter, status
from app.schemas.answer import AnswerExtractionResponse
from app.services.answer_extraction_service import answer_extraction_service, answer_storage

router = APIRouter()

@router.post(
    "/{job_id}/extract-answers",
    response_model=AnswerExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract handwritten answers from Answer Sheet via Gemini Vision",
    description="Transcribes student handwritten responses, detects question labels, supports multi-page continuation answers, identifies unmatched regions, and returns normalized bounding box coordinates."
)
async def extract_answers(job_id: str) -> AnswerExtractionResponse:
    return await answer_extraction_service.extract_answers_for_job(job_id)

@router.get(
    "/{job_id}/answers",
    response_model=AnswerExtractionResponse,
    summary="Get previously extracted answers for a job"
)
async def get_extracted_answers(job_id: str) -> AnswerExtractionResponse:
    return answer_storage.get(job_id)
