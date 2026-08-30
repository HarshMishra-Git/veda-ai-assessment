from fastapi import APIRouter, status
from app.schemas.question import QuestionExtractionResponse
from app.services.question_extraction_service import question_extraction_service

router = APIRouter()

@router.post(
    "/{job_id}/extract-questions",
    response_model=QuestionExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract structured questions from Question Paper via Gemini Vision",
    description="Analyzes the rendered question paper pages using Gemini multimodal vision and returns all questions in printed order with exact numbering, subparts (11a, 11b), marks, and normalized bounding box coordinates."
)
async def extract_questions(job_id: str) -> QuestionExtractionResponse:
    return await question_extraction_service.extract_questions_for_job(job_id)
