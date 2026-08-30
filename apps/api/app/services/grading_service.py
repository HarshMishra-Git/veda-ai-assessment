import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.grading import AssessmentGradingResponse, QuestionGrade
from app.schemas.mapping import AssessmentMappingResponse, MappedQuestionAnswer
from app.services.gemini_service import gemini_service
from app.services.mapping_service import mapping_service

logger = logging.getLogger(__name__)

GRADING_SYSTEM_PROMPT = """
You are an expert academic evaluator and assessment grading AI.
Your task is to evaluate student examination answers against question text, concepts, and maximum allocated marks.

For each question provided:
1. Compare the student's transcribed answer against the question requirements.
2. If status is 'unanswered' or student provided no answer:
   - obtained_marks: 0.0
   - verdict: "unanswered"
   - feedback: "No answer was provided by the student for this question."
   - confidence: 1.0
3. If student provided an answer:
   - Award a fair score strictly between 0.0 and max_marks (obtained_marks <= max_marks).
   - If completely accurate and complete: verdict = "correct".
   - If partially accurate or incomplete: verdict = "partial".
   - If completely incorrect or irrelevant: verdict = "incorrect" with obtained_marks = 0.0.
   - Write clear, concise, and encouraging pedagogical feedback explaining what was correct and what can be improved.
   - Assign a confidence score between 0.0 and 1.0.
4. Also write an encouraging, constructive 2-3 sentence `overall_summary` evaluating the student's overall performance.

Output MUST be valid JSON adhering to this schema:
{
  "overall_summary": "Overall evaluation summary text...",
  "grades": [
    {
      "question_id": "q1",
      "obtained_marks": 2.0,
      "verdict": "correct",
      "feedback": "Great job! The formula and explanation of photosynthesis are completely accurate.",
      "confidence": 0.98
    }
  ]
}
"""

class GradingStorage:
    def __init__(self):
        # job_id -> AssessmentGradingResponse
        self.grades_by_job: Dict[str, AssessmentGradingResponse] = {}

    def save(self, response: AssessmentGradingResponse):
        self.grades_by_job[response.job_id] = response

    def get(self, job_id: str) -> AssessmentGradingResponse:
        if job_id not in self.grades_by_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Grading for job {job_id} not found."
            )
        return self.grades_by_job[job_id]

grading_storage = GradingStorage()

class GradingService:
    @classmethod
    async def grade_assessment(cls, job_id: str) -> AssessmentGradingResponse:
        # Step 1: Fetch Question ↔ Answer mappings
        try:
            mapping_res = await mapping_service.map_questions_and_answers(job_id)
        except Exception as e:
            logger.error(f"Error fetching mapping for grading: {e}")
            raise e

        if not mapping_res.mappings or len(mapping_res.mappings) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No questions available to grade."
            )

        # Prepare payload for Gemini
        items_to_grade: List[dict] = []
        for m in mapping_res.mappings:
            max_m = m.allocated_marks or 2
            ans_text = m.answer.transcribed_text if m.answer and m.status == "mapped" else None
            items_to_grade.append({
                "question_id": m.question_id,
                "question_number": m.question_number,
                "sub_label": m.sub_label,
                "question_text": m.question_text,
                "max_marks": max_m,
                "status": m.status,
                "student_answer": ans_text,
            })

        grades_lookup: Dict[str, dict] = {}
        overall_summary = "Assessment evaluation complete."

        # Step 2: Call Gemini Vision/Text Grading Engine
        if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"):
            try:
                client = gemini_service.client
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL or "gemini-3.6-flash",
                    contents=[
                        types.Part.from_text(text=json.dumps({"questions_to_grade": items_to_grade})),
                        "Evaluate and grade each question strictly following the grading rubric and allocated marks."
                    ],
                    config=types.GenerateContentConfig(
                        system_instruction=GRADING_SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )

                resp_text = response.text or "{}"
                graded_data = json.loads(resp_text)
                overall_summary = graded_data.get("overall_summary", "Assessment grading successfully completed.")
                raw_grades = graded_data.get("grades", [])

                for g in raw_grades:
                    q_id = g.get("question_id")
                    if q_id:
                        grades_lookup[q_id] = g
            except Exception as e:
                logger.error(f"Gemini grading API error: {e}")

        # Step 3: Compile structured grades with strict mark bounds
        final_grades: List[QuestionGrade] = []
        total_max_marks = 0.0
        total_obtained_marks = 0.0
        correct_count = 0
        partial_count = 0
        incorrect_count = 0
        unanswered_count = 0

        for item in items_to_grade:
            q_id = item["question_id"]
            max_m = item["max_marks"]
            total_max_marks += max_m

            if item["status"] == "unanswered" or not item["student_answer"]:
                # Unanswered rule
                obtained = 0.0
                verdict = "unanswered"
                feedback = "No answer was provided by the student for this question."
                conf = 1.0
                unanswered_count += 1
            else:
                grade_info = grades_lookup.get(q_id, {})
                raw_obtained = float(grade_info.get("obtained_marks", max_m))
                # Strict clamping: 0 <= obtained <= max_m
                obtained = max(0.0, min(raw_obtained, float(max_m)))
                verdict = grade_info.get("verdict", "correct" if obtained == max_m else ("partial" if obtained > 0 else "incorrect"))
                feedback = grade_info.get("feedback", "Answer evaluated successfully.")
                conf = float(grade_info.get("confidence", 0.95))

                if verdict == "correct" or obtained == max_m:
                    correct_count += 1
                    verdict = "correct"
                elif verdict == "partial" or (obtained > 0 and obtained < max_m):
                    partial_count += 1
                    verdict = "partial"
                else:
                    incorrect_count += 1
                    verdict = "incorrect"

            total_obtained_marks += obtained

            final_grades.append(
                QuestionGrade(
                    question_id=q_id,
                    question_number=item["question_number"],
                    sub_label=item["sub_label"],
                    max_marks=max_m,
                    obtained_marks=round(obtained, 1),
                    verdict=verdict,
                    feedback=feedback,
                    confidence=conf,
                    answer_text=item["student_answer"],
                )
            )

        percentage = round((total_obtained_marks / total_max_marks * 100.0), 1) if total_max_marks > 0 else 0.0

        response = AssessmentGradingResponse(
            job_id=job_id,
            status="graded",
            total_max_marks=total_max_marks,
            total_obtained_marks=round(total_obtained_marks, 1),
            percentage=percentage,
            correct_count=correct_count,
            partial_count=partial_count,
            incorrect_count=incorrect_count,
            unanswered_count=unanswered_count,
            overall_summary=overall_summary,
            grades=final_grades,
            graded_at=datetime.now(timezone.utc).isoformat(),
        )

        grading_storage.save(response)
        return response

grading_service = GradingService()
