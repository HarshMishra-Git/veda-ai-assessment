from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: float = Field(..., description="X coordinate in percentage [0, 100]")
    y: float = Field(..., description="Y coordinate in percentage [0, 100]")
    width: float = Field(..., description="Width in percentage [0, 100]")
    height: float = Field(..., description="Height in percentage [0, 100]")
    confidence: Optional[float] = Field(None, description="Detection confidence score")

class TextBlock(BaseModel):
    id: str
    text: str
    box: BoundingBox
    page_number: int

class PageInfo(BaseModel):
    page_number: int
    width: int
    height: int
    image_url: Optional[str] = None

class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    content_type: str
    file_size: int
    total_pages: int
    pages: List[PageInfo]

class JobResponse(BaseModel):
    job_id: str
    status: str
    question_paper: DocumentInfo
    answer_sheet: DocumentInfo
    created_at: str

class ErrorResponse(BaseModel):
    detail: str
