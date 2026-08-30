import logging
from datetime import datetime, timezone
from typing import List
from fastapi import HTTPException, status

from app.schemas.question import ExtractedQuestion, QuestionExtractionResponse
from app.services.document_service import storage
from app.services.gemini_service import gemini_service
from app.core.config import settings

logger = logging.getLogger(__name__)

class QuestionExtractionService:
    @staticmethod
    async def extract_questions_for_job(job_id: str) -> QuestionExtractionResponse:
        job = storage.get_job(job_id)
        qp_doc = job.question_paper

        if not qp_doc or qp_doc.total_pages == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question paper has no valid pages to extract."
            )

        all_extracted_questions: List[ExtractedQuestion] = []

        # If Gemini API key is configured, run real multimodal extraction per page
        if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"):
            try:
                for page_info in qp_doc.pages:
                    page_num = page_info.page_number
                    image_bytes = storage.get_page_image(job_id, "question_paper", page_num)
                    page_questions = await gemini_service.extract_questions_from_page_image(
                        image_bytes=image_bytes,
                        page_number=page_num
                    )
                    all_extracted_questions.extend(page_questions)
            except Exception as e:
                logger.error(f"Gemini extraction failed: {e}. Falling back to default questions if available.")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Question extraction failed: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GEMINI_API_KEY is missing or unconfigured. Please provide a valid Gemini API key in settings."
            )

        # Sort questions by question number
        all_extracted_questions.sort(key=lambda q: q.number)

        return QuestionExtractionResponse(
            job_id=job_id,
            status="extracted",
            total_questions=len(all_extracted_questions),
            questions=all_extracted_questions,
            extracted_at=datetime.now(timezone.utc).isoformat()
        )

question_extraction_service = QuestionExtractionService()
