import json
import logging
from typing import List, Optional
from google import genai
from google.genai import types
from PIL import Image
import io

from app.core.config import settings
from app.schemas.document import BoundingBox
from app.schemas.question import ExtractedQuestion, ExtractedSubQuestion
from app.schemas.answer import AnswerPageLocation, ExtractedAnswer

logger = logging.getLogger(__name__)

QUESTION_EXTRACTION_SYSTEM_PROMPT = """
You are an expert OCR & assessment analysis engine. Your task is to analyze an image of a Question Paper page and extract all examination questions with extreme precision.

Follow these strict rules:
1. Extract EVERY question in the exact printed top-to-bottom reading order.
2. Preserve original question numbering accurately (e.g. 1, 2, 3... 11, 12, 13).
3. Check for subparts/subquestions (e.g., 11(a), 11(b), (i), (ii), a., b.).
   - If a question has subparts, place them inside `sub_questions` array.
   - Set `sub_label` to the exact label (e.g. 'a.', 'b.', '(i)').
   - Also capture the question's introductory context/text in the parent question `text`.
4. Capture marks accurately when specified in brackets or next to the question (e.g., '[2]', '(2 Marks)', '[5m]'). If no marks are indicated, set marks to null.
5. Provide accurate normalized bounding box coordinates for each question and subquestion on the page:
   - `x`: horizontal start as percentage of page width [0.0 to 100.0]
   - `y`: vertical start as percentage of page height [0.0 to 100.0]
   - `width`: percentage width [0.0 to 100.0]
   - `height`: percentage height [0.0 to 100.0]

Output MUST be valid JSON adhering to this schema:
{
  "questions": [
    {
      "number": 1,
      "text": "Full text of the question...",
      "marks": 2,
      "bounding_box": {
        "x": 5.0,
        "y": 12.0,
        "width": 90.0,
        "height": 6.5
      },
      "sub_questions": []
    }
  ]
}
"""

ANSWER_EXTRACTION_SYSTEM_PROMPT = """
You are an advanced handwriting OCR and student answer extraction AI.
Your task is to analyze an image of a student's handwritten answer sheet page and extract all handwritten answers with high precision.

Rules:
1. Identify each distinct handwritten answer block in top-to-bottom reading order on the page.
2. Detect question/answer labels written by the student:
   - e.g. "Q1.", "Ans 1", "Question 2", "11(a)", "11.b", "Ans 4 (cont.)".
   - If an explicit question number is detected, extract `detected_label` (e.g. "Q1", "Ans 2") and integer `question_number` (e.g. 1, 2).
   - If it has a subpart label (e.g. 'a', 'b', '(i)'), extract `sub_label` (e.g. 'a.').
   - If the handwritten block has NO recognizable question label or is an unlabelled scratchpad/note, set `detected_label`: "unmatched", `question_number`: null, `is_unmatched`: true.
3. Transcribe the student's handwritten text accurately, preserving key scientific terms, equations, chemical formulas, and diagram descriptions.
4. Detect if this answer block indicates a continuation from a previous page (e.g. "Q4 cont.", "continued on next page"), and set `is_continuation`: true.
5. Provide accurate normalized bounding box coordinates for the entire handwritten answer region:
   - `x`: percentage of page width [0.0 to 100.0]
   - `y`: percentage of page height [0.0 to 100.0]
   - `width`: percentage width [0.0 to 100.0]
   - `height`: percentage height [0.0 to 100.0]
6. Assign a `confidence` score between 0.0 and 1.0 based on handwriting legibility.

Output MUST be valid JSON adhering to this schema:
{
  "answers": [
    {
      "detected_label": "Q1",
      "question_number": 1,
      "sub_label": null,
      "transcribed_text": "Photosynthesis is the process used by green plants...",
      "bounding_box": {
        "x": 6.0,
        "y": 8.0,
        "width": 88.0,
        "height": 24.0
      },
      "confidence": 0.95,
      "is_unmatched": false,
      "is_continuation": false
    }
  ]
}
"""

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
        self._client = None

    @property
    def client(self) -> genai.Client:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def extract_questions_from_page_image(
        self,
        image_bytes: bytes,
        page_number: int
    ) -> List[ExtractedQuestion]:
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Returning empty list.")
            return []

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                    f"Analyze Question Paper Page {page_number} and extract all questions."
                ],
                config=types.GenerateContentConfig(
                    system_instruction=QUESTION_EXTRACTION_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            response_text = response.text or "{}"
            parsed_data = json.loads(response_text)
            raw_questions = parsed_data.get("questions", [])

            extracted: List[ExtractedQuestion] = []
            for item in raw_questions:
                q_num = item.get("number", len(extracted) + 1)
                q_id = f"q{q_num}"
                
                raw_box = item.get("bounding_box") or {}
                bbox = BoundingBox(
                    x=float(raw_box.get("x", 5.0)),
                    y=float(raw_box.get("y", 10.0)),
                    width=float(raw_box.get("width", 90.0)),
                    height=float(raw_box.get("height", 8.0)),
                    confidence=1.0
                )

                sub_qs: Optional[List[ExtractedSubQuestion]] = None
                if item.get("sub_questions"):
                    sub_qs = []
                    for idx, sq in enumerate(item["sub_questions"]):
                        sub_label = sq.get("sub_label") or f"({idx+1})"
                        clean_sub = sub_label.strip().replace("(", "").replace(")", "").replace(".", "")
                        sq_id = f"q{q_num}{clean_sub}"
                        sq_box_raw = sq.get("bounding_box") or {}
                        sq_bbox = BoundingBox(
                            x=float(sq_box_raw.get("x", bbox.x)),
                            y=float(sq_box_raw.get("y", bbox.y)),
                            width=float(sq_box_raw.get("width", bbox.width)),
                            height=float(sq_box_raw.get("height", 5.0)),
                            confidence=1.0
                        )
                        sub_qs.append(
                            ExtractedSubQuestion(
                                id=sq_id,
                                sub_label=sub_label,
                                text=sq.get("text", ""),
                                marks=sq.get("marks"),
                                page_number=page_number,
                                bounding_box=sq_bbox
                            )
                        )

                question_obj = ExtractedQuestion(
                    id=q_id,
                    number=q_num,
                    text=item.get("text", ""),
                    marks=item.get("marks"),
                    page_number=page_number,
                    bounding_box=bbox,
                    sub_questions=sub_qs
                )
                extracted.append(question_obj)

            return extracted

        except Exception as e:
            logger.error(f"Error during Gemini question extraction on page {page_number}: {e}")
            raise e

    async def extract_answers_from_page_image(
        self,
        image_bytes: bytes,
        page_number: int
    ) -> List[ExtractedAnswer]:
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Returning empty list.")
            return []

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                    f"Transcribe and extract handwritten answers from Answer Sheet Page {page_number}."
                ],
                config=types.GenerateContentConfig(
                    system_instruction=ANSWER_EXTRACTION_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            response_text = response.text or "{}"
            parsed_data = json.loads(response_text)
            raw_answers = parsed_data.get("answers", [])

            extracted: List[ExtractedAnswer] = []
            for idx, item in enumerate(raw_answers):
                q_num = item.get("question_number")
                sub_label = item.get("sub_label")
                is_unmatched = bool(item.get("is_unmatched", False) or q_num is None)
                
                if is_unmatched:
                    ans_id = f"ans_p{page_number}_unmatched_{idx+1}"
                elif sub_label:
                    clean_sub = sub_label.strip().replace("(", "").replace(")", "").replace(".", "")
                    ans_id = f"ans_q{q_num}{clean_sub}"
                else:
                    ans_id = f"ans_q{q_num}"

                raw_box = item.get("bounding_box") or {}
                bbox = BoundingBox(
                    x=float(raw_box.get("x", 6.0)),
                    y=float(raw_box.get("y", 10.0)),
                    width=float(raw_box.get("width", 88.0)),
                    height=float(raw_box.get("height", 15.0)),
                    confidence=float(item.get("confidence", 0.95))
                )

                location = AnswerPageLocation(
                    page_number=page_number,
                    bounding_box=bbox,
                    is_continuation=bool(item.get("is_continuation", False))
                )

                ans_obj = ExtractedAnswer(
                    id=ans_id,
                    detected_label=item.get("detected_label"),
                    question_number=q_num,
                    sub_label=sub_label,
                    transcribed_text=item.get("transcribed_text", ""),
                    locations=[location],
                    confidence=float(item.get("confidence", 0.95)),
                    is_unmatched=is_unmatched,
                    is_multi_page=False
                )
                extracted.append(ans_obj)

            return extracted

        except Exception as e:
            logger.error(f"Error during Gemini answer extraction on page {page_number}: {e}")
            raise e

gemini_service = GeminiService()
