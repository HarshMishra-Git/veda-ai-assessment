from typing import List, Optional
from pydantic import BaseModel, Field

class QuestionGrade(BaseModel):
    question_id: str = Field(..., description="ID of question or subquestion, e.g. 'q1' or 'q11a'")
    question_number: int = Field(..., description="Question number, e.g. 1, 2, 11")
    sub_label: Optional[str] = Field(None, description="Subquestion label, e.g. 'a.', 'b.' (None if not a subpart)")
    max_marks: int = Field(..., description="Maximum marks for this question")
    obtained_marks: float = Field(..., description="Marks awarded by AI (between 0 and max_marks)")
    verdict: str = Field(..., description="Grading verdict: 'correct', 'partial', 'incorrect', or 'unanswered'")
    feedback: str = Field(..., description="Constructive pedagogical feedback explaining the grade")
    confidence: float = Field(default=1.0, description="Grading confidence score [0.0 to 1.0]")
    answer_text: Optional[str] = Field(None, description="The evaluated student transcribed answer text")

class AssessmentGradingResponse(BaseModel):
    job_id: str
    status: str = "graded"
    total_max_marks: float
    total_obtained_marks: float
    percentage: float
    correct_count: int
    partial_count: int
    incorrect_count: int
    unanswered_count: int
    overall_summary: str
    grades: List[QuestionGrade]
    graded_at: str
