import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.answer import ExtractedAnswer
from app.schemas.mapping import (
    AssessmentMappingResponse,
    MappedQuestionAnswer,
    UnmatchedAnswerItem,
)
from app.schemas.question import ExtractedQuestion, ExtractedSubQuestion
from app.services.answer_extraction_service import answer_extraction_service, answer_storage
from app.services.gemini_service import gemini_service
from app.services.question_extraction_service import question_extraction_service

logger = logging.getLogger(__name__)

SEMANTIC_MAPPING_SYSTEM_PROMPT = """
You are an intelligent Question-Answer alignment AI.
Your task is to match unlabelled or ambiguous student handwritten answers to examination questions.

Given:
1. A list of unmapped questions (with question ID, number, subpart, text).
2. A list of unmapped student answers (with answer ID and transcribed text).

Rules:
1. Perform deep semantic analysis to determine if an answer specifically addresses an unmapped question.
2. Only match if the confidence is high (score >= 0.70). Do NOT guess.
3. If an answer does not clearly correspond to any remaining question, do NOT match it.
4. Each answer can be mapped to at most ONE question.

Return valid JSON adhering to this schema:
{
  "matches": [
    {
      "answer_id": "ans_p2_unmatched_1",
      "question_id": "q3",
      "confidence": 0.88,
      "reason": "Directly explains chloroplasts and thylakoid light absorption."
    }
  ]
}
"""

class MappingStorage:
    def __init__(self):
        # job_id -> AssessmentMappingResponse
        self.mappings_by_job: Dict[str, AssessmentMappingResponse] = {}

    def save(self, response: AssessmentMappingResponse):
        self.mappings_by_job[response.job_id] = response

    def get(self, job_id: str) -> AssessmentMappingResponse:
        if job_id not in self.mappings_by_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mapping for job {job_id} not found."
            )
        return self.mappings_by_job[job_id]

mapping_storage = MappingStorage()

class QuestionAnswerMappingService:
    @staticmethod
    def _normalize_label(label: Optional[str]) -> Tuple[Optional[int], Optional[str]]:
        """
        Parses labels like 'Q1.', 'Ans 2', '11(a)', '11.b', 'Question 3' into (num, sub).
        """
        if not label:
            return None, None
        
        cleaned = label.strip().lower()
        # Extract question number
        num_match = re.search(r'\b(?:q|ans|question)?\s*(\d+)', cleaned)
        if not num_match:
            return None, None
        
        q_num = int(num_match.group(1))

        # Extract subpart (e.g. 'a', 'b', 'i', 'ii')
        sub_match = re.search(r'[\(\.]\s*([a-z]|[ivx]+)\s*[\)\.]?', cleaned)
        sub_val = None
        if sub_match:
            sub_val = sub_match.group(1).lower()
        else:
            # Check trailing character e.g. '11a'
            trailing_sub = re.search(r'\d+\s*([a-z])\b', cleaned)
            if trailing_sub:
                sub_val = trailing_sub.group(1).lower()

        return q_num, sub_val

    @classmethod
    async def map_questions_and_answers(cls, job_id: str) -> AssessmentMappingResponse:
        # Step 1: Ensure extracted questions are ready
        try:
            questions_res = await question_extraction_service.extract_questions_for_job(job_id)
        except Exception as e:
            logger.error(f"Error fetching/extracting questions: {e}")
            raise e

        # Step 2: Ensure extracted answers are ready
        try:
            answers_res = await answer_extraction_service.extract_answers_for_job(job_id)
        except Exception as e:
            logger.error(f"Error fetching/extracting answers: {e}")
            raise e

        # Flatten questions to evaluate subquestions individually
        flattened_target_items: List[dict] = []
        for q in questions_res.questions:
            if q.sub_questions and len(q.sub_questions) > 0:
                for sq in q.sub_questions:
                    clean_sub = sq.sub_label.replace("(", "").replace(")", "").replace(".", "").strip().lower()
                    flattened_target_items.append({
                        "question_id": sq.id,
                        "question_number": q.number,
                        "sub_label": sq.sub_label,
                        "clean_sub": clean_sub,
                        "question_text": sq.text,
                        "allocated_marks": sq.marks,
                        "page_number": sq.page_number,
                        "bounding_box": sq.bounding_box,
                        "is_subquestion": True,
                    })
            else:
                flattened_target_items.append({
                    "question_id": q.id,
                    "question_number": q.number,
                    "sub_label": None,
                    "clean_sub": None,
                    "question_text": q.text,
                    "allocated_marks": q.marks,
                    "page_number": q.page_number,
                    "bounding_box": q.bounding_box,
                    "is_subquestion": False,
                })

        available_answers: List[ExtractedAnswer] = list(answers_res.answers)
        mapped_results: Dict[str, MappedQuestionAnswer] = {}
        assigned_answer_ids: Set[str] = set()

        # =========================================================================
        # Stage 1: Deterministic Label Matching
        # =========================================================================
        for target in flattened_target_items:
            q_id = target["question_id"]
            q_num = target["question_number"]
            clean_sub = target["clean_sub"]

            # Search available answers for matching label
            matched_ans: Optional[ExtractedAnswer] = None
            for ans in available_answers:
                if ans.id in assigned_answer_ids or ans.is_unmatched:
                    continue

                ans_q_num = ans.question_number
                ans_sub = ans.sub_label.lower().replace("(", "").replace(")", "").replace(".", "").strip() if ans.sub_label else None

                # Also test regex normalized label from detected_label
                parsed_q_num, parsed_sub = cls._normalize_label(ans.detected_label)

                final_ans_q_num = ans_q_num or parsed_q_num
                final_ans_sub = ans_sub or parsed_sub

                if final_ans_q_num == q_num:
                    if clean_sub:
                        if final_ans_sub and (final_ans_sub == clean_sub or clean_sub in final_ans_sub):
                            matched_ans = ans
                            break
                    else:
                        if not final_ans_sub:
                            matched_ans = ans
                            break

            if matched_ans:
                assigned_answer_ids.add(matched_ans.id)
                mapped_results[q_id] = MappedQuestionAnswer(
                    question_id=q_id,
                    question_number=q_num,
                    sub_label=target["sub_label"],
                    question_text=target["question_text"],
                    allocated_marks=target["allocated_marks"],
                    question_page_number=target["page_number"],
                    question_bounding_box=target["bounding_box"],
                    status="mapped",
                    mapping_method="label",
                    mapping_confidence=matched_ans.confidence,
                    answer=matched_ans,
                )

        # =========================================================================
        # Stage 2: Semantic Matching with Gemini for Remaining Unmapped Items
        # =========================================================================
        unmapped_targets = [t for t in flattened_target_items if t["question_id"] not in mapped_results]
        unassigned_answers = [a for a in available_answers if a.id not in assigned_answer_ids]

        if unmapped_targets and unassigned_answers and settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"):
            try:
                prompt_payload = {
                    "unmapped_questions": [
                        {"id": t["question_id"], "number": t["question_number"], "sub": t["sub_label"], "text": t["question_text"]}
                        for t in unmapped_targets
                    ],
                    "unassigned_answers": [
                        {"id": a.id, "detected_label": a.detected_label, "text": a.transcribed_text}
                        for a in unassigned_answers
                    ]
                }

                client = gemini_service.client
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL or "gemini-3.6-flash",
                    contents=[
                        types.Part.from_text(text=json.dumps(prompt_payload)),
                        "Match unassigned answers to unmapped questions based on strong semantic similarity."
                    ],
                    config=types.GenerateContentConfig(
                        system_instruction=SEMANTIC_MAPPING_SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.0,
                    ),
                )

                resp_text = response.text or "{}"
                semantic_data = json.loads(resp_text)
                matches = semantic_data.get("matches", [])

                for m in matches:
                    ans_id = m.get("answer_id")
                    q_id = m.get("question_id")
                    conf = float(m.get("confidence", 0.0))

                    if conf >= 0.70 and ans_id not in assigned_answer_ids and q_id in [t["question_id"] for t in unmapped_targets]:
                        matched_answer_obj = next((a for a in unassigned_answers if a.id == ans_id), None)
                        target_obj = next((t for t in unmapped_targets if t["question_id"] == q_id), None)

                        if matched_answer_obj and target_obj:
                            assigned_answer_ids.add(matched_answer_obj.id)
                            mapped_results[q_id] = MappedQuestionAnswer(
                                question_id=q_id,
                                question_number=target_obj["question_number"],
                                sub_label=target_obj["sub_label"],
                                question_text=target_obj["question_text"],
                                allocated_marks=target_obj["allocated_marks"],
                                question_page_number=target_obj["page_number"],
                                question_bounding_box=target_obj["bounding_box"],
                                status="mapped",
                                mapping_method="semantic",
                                mapping_confidence=conf,
                                answer=matched_answer_obj,
                            )
            except Exception as e:
                logger.warning(f"Semantic mapping fallback encountered error: {e}")

        # =========================================================================
        # Stage 3: Resolve Unanswered Questions and Unmatched Answers
        # =========================================================================
        final_mappings: List[MappedQuestionAnswer] = []
        for target in flattened_target_items:
            q_id = target["question_id"]
            if q_id in mapped_results:
                final_mappings.append(mapped_results[q_id])
            else:
                # Question has no mapped answer -> unanswered
                final_mappings.append(
                    MappedQuestionAnswer(
                        question_id=q_id,
                        question_number=target["question_number"],
                        sub_label=target["sub_label"],
                        question_text=target["question_text"],
                        allocated_marks=target["allocated_marks"],
                        question_page_number=target["page_number"],
                        question_bounding_box=target["bounding_box"],
                        status="unanswered",
                        mapping_method=None,
                        mapping_confidence=0.0,
                        answer=None,
                    )
                )

        unmatched_answers: List[UnmatchedAnswerItem] = []
        for ans in available_answers:
            if ans.id not in assigned_answer_ids:
                unmatched_answers.append(
                    UnmatchedAnswerItem(
                        answer_id=ans.id,
                        detected_label=ans.detected_label,
                        transcribed_text=ans.transcribed_text,
                        locations=ans.locations,
                        confidence=ans.confidence,
                        reason="No matching question identified or confidence below threshold",
                    )
                )

        mapped_count = sum(1 for m in final_mappings if m.status == "mapped")
        unanswered_count = sum(1 for m in final_mappings if m.status == "unanswered")

        response = AssessmentMappingResponse(
            job_id=job_id,
            status="mapped",
            total_questions=len(final_mappings),
            mapped_count=mapped_count,
            unanswered_count=unanswered_count,
            unmatched_answers_count=len(unmatched_answers),
            mappings=final_mappings,
            unmatched_answers=unmatched_answers,
            mapped_at=datetime.now(timezone.utc).isoformat(),
        )

        mapping_storage.save(response)
        return response

mapping_service = QuestionAnswerMappingService()
