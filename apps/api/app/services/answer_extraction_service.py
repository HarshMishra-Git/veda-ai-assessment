import logging
from datetime import datetime, timezone
from typing import Dict, List
from fastapi import HTTPException, status

from app.schemas.answer import AnswerExtractionResponse, ExtractedAnswer
from app.services.document_service import storage
from app.services.gemini_service import gemini_service
from app.core.config import settings

logger = logging.getLogger(__name__)

class AnswerStorage:
    def __init__(self):
        # job_id -> AnswerExtractionResponse
        self.answers_by_job: Dict[str, AnswerExtractionResponse] = {}

    def save(self, response: AnswerExtractionResponse):
        self.answers_by_job[response.job_id] = response

    def get(self, job_id: str) -> AnswerExtractionResponse:
        if job_id not in self.answers_by_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Extracted answers for job {job_id} not found."
            )
        return self.answers_by_job[job_id]

answer_storage = AnswerStorage()

class AnswerExtractionService:
    @staticmethod
    async def extract_answers_for_job(job_id: str) -> AnswerExtractionResponse:
        job = storage.get_job(job_id)
        as_doc = job.answer_sheet

        if not as_doc or as_doc.total_pages == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answer sheet has no valid pages to extract."
            )

        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GEMINI_API_KEY is missing or unconfigured."
            )

        raw_page_answers: List[ExtractedAnswer] = []

        try:
            for page_info in as_doc.pages:
                page_num = page_info.page_number
                image_bytes = storage.get_page_image(job_id, "answer_sheet", page_num)
                page_answers = await gemini_service.extract_answers_from_page_image(
                    image_bytes=image_bytes,
                    page_number=page_num
                )
                raw_page_answers.extend(page_answers)
        except Exception as e:
            logger.error(f"Gemini answer extraction failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Answer extraction failed: {str(e)}"
            )

        # Multi-page answer combiner:
        # Group answers sharing the same question_number and sub_label if they indicate continuation or repeat
        combined_answers: List[ExtractedAnswer] = []
        answer_lookup: Dict[str, ExtractedAnswer] = {}

        for ans in raw_page_answers:
            if ans.is_unmatched or ans.question_number is None:
                # Keep unmatched answers as distinct standalone items
                combined_answers.append(ans)
                continue

            # Create grouping key
            key = f"q{ans.question_number}_{ans.sub_label or ''}"
            if key in answer_lookup:
                # Merge continuation into existing answer
                existing = answer_lookup[key]
                existing.transcribed_text += f"\n\n[Continued on Page {ans.locations[0].page_number}]:\n{ans.transcribed_text}"
                existing.locations.extend(ans.locations)
                existing.is_multi_page = True
            else:
                answer_lookup[key] = ans
                combined_answers.append(ans)

        response = AnswerExtractionResponse(
            job_id=job_id,
            status="extracted",
            total_answers=len(combined_answers),
            answers=combined_answers,
            extracted_at=datetime.now(timezone.utc).isoformat()
        )

        answer_storage.save(response)
        return response

answer_extraction_service = AnswerExtractionService()
