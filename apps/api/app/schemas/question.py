from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.document import BoundingBox

class ExtractedSubQuestion(BaseModel):
    id: str = Field(..., description="Unique subquestion identifier, e.g., 'q11a'")
    sub_label: str = Field(..., description="Subpart label, e.g. 'a.', 'b.', '(i)', '(ii)'")
    text: str = Field(..., description="Full text of the subquestion")
    marks: Optional[int] = Field(None, description="Marks allocated to this subquestion")
    page_number: int = Field(..., description="Page number where the subquestion appears (1-indexed)")
    bounding_box: BoundingBox = Field(..., description="Normalized bounding box [0-100%] of the subquestion")

class ExtractedQuestion(BaseModel):
    id: str = Field(..., description="Unique question identifier, e.g., 'q1'")
    number: int = Field(..., description="Main question number, e.g., 1, 2, 11")
    text: str = Field(..., description="Full text of the main question")
    marks: Optional[int] = Field(None, description="Total marks allocated to this question")
    page_number: int = Field(..., description="Page number where question appears (1-indexed)")
    bounding_box: BoundingBox = Field(..., description="Normalized bounding box [0-100%] of the question on page")
    sub_questions: Optional[List[ExtractedSubQuestion]] = Field(default=None, description="Split subparts if present")

class PageExtractionResult(BaseModel):
    page_number: int
    questions: List[ExtractedQuestion]

class QuestionExtractionResponse(BaseModel):
    job_id: str
    status: str
    total_questions: int
    questions: List[ExtractedQuestion]
    extracted_at: str
