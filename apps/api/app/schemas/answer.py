from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.document import BoundingBox

class AnswerPageLocation(BaseModel):
    page_number: int = Field(..., description="1-indexed page number where the answer content is located")
    bounding_box: BoundingBox = Field(..., description="Normalized bounding box [0-100%] of this answer region")
    is_continuation: bool = Field(default=False, description="True if this region continues from a previous page")

class ExtractedAnswer(BaseModel):
    id: str = Field(..., description="Unique answer ID, e.g. 'ans_q1'")
    detected_label: Optional[str] = Field(None, description="Detected question label, e.g. 'Q1', 'Ans 2', '11(a)'")
    question_number: Optional[int] = Field(None, description="Parsed question number, e.g. 1, 2, 11 (None if unmatched)")
    sub_label: Optional[str] = Field(None, description="Subquestion label, e.g. 'a.', 'b.' (None if not a subpart)")
    transcribed_text: str = Field(..., description="Transcribed handwritten student response text")
    locations: List[AnswerPageLocation] = Field(..., description="List of page locations/boxes containing this answer")
    confidence: float = Field(default=1.0, description="Transcription & mapping confidence [0.0 to 1.0]")
    is_unmatched: bool = Field(default=False, description="True if answer cannot be confidently linked to any question")
    is_multi_page: bool = Field(default=False, description="True if answer spans across multiple pages")

class AnswerExtractionResponse(BaseModel):
    job_id: str
    status: str
    total_answers: int
    answers: List[ExtractedAnswer]
    extracted_at: str
