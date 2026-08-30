from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.answer import AnswerPageLocation, ExtractedAnswer
from app.schemas.document import BoundingBox

class MappedQuestionAnswer(BaseModel):
    question_id: str = Field(..., description="ID of question or subquestion, e.g. 'q1' or 'q11a'")
    question_number: int = Field(..., description="Question number, e.g. 1, 2, 11")
    sub_label: Optional[str] = Field(None, description="Subquestion label, e.g. 'a.', 'b.' (None if not a subpart)")
    question_text: str = Field(..., description="Text of the question")
    allocated_marks: Optional[int] = Field(None, description="Marks allocated to this question")
    question_page_number: int = Field(..., description="Page number of question in question paper")
    question_bounding_box: BoundingBox = Field(..., description="Bounding box of question on question paper")
    status: str = Field(..., description="Mapping status: 'mapped' or 'unanswered'")
    mapping_method: Optional[str] = Field(None, description="Method used: 'label', 'semantic', or None")
    mapping_confidence: float = Field(default=1.0, description="Confidence of the mapping [0.0 to 1.0]")
    answer: Optional[ExtractedAnswer] = Field(None, description="Matched student answer details if status == 'mapped'")

class UnmatchedAnswerItem(BaseModel):
    answer_id: str
    detected_label: Optional[str] = None
    transcribed_text: str
    locations: List[AnswerPageLocation]
    confidence: float
    reason: str = Field(default="No confident matching question found")

class AssessmentMappingResponse(BaseModel):
    job_id: str
    status: str = "mapped"
    total_questions: int
    mapped_count: int
    unanswered_count: int
    unmatched_answers_count: int
    mappings: List[MappedQuestionAnswer]
    unmatched_answers: List[UnmatchedAnswerItem]
    mapped_at: str
