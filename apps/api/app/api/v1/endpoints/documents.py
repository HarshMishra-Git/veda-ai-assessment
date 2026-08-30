from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from app.schemas.document import JobResponse
from app.services.document_service import DocumentService, storage

router = APIRouter()

@router.post(
    "/upload",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload question paper and answer sheet documents",
    description="Accepts Question Paper and Answer Sheet files (PDF/Images <= 10MB), validates, renders page images, and stores metadata."
)
async def upload_documents(
    question_paper: UploadFile = File(..., description="Question paper document (PDF or Image)"),
    answer_sheet: UploadFile = File(..., description="Handwritten answer sheet document (PDF or Image)"),
) -> JobResponse:
    return await DocumentService.process_ingestion(
        question_paper=question_paper,
        answer_sheet=answer_sheet
    )

@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get document processing job metadata"
)
async def get_job_details(job_id: str) -> JobResponse:
    return storage.get_job(job_id)

@router.get(
    "/{job_id}/pages/{doc_type}/{page_number}",
    summary="Get rendered high-resolution PNG page image"
)
async def get_page_image(job_id: str, doc_type: str, page_number: int):
    if doc_type not in ["question_paper", "answer_sheet"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doc_type must be either 'question_paper' or 'answer_sheet'"
        )
    image_bytes = storage.get_page_image(job_id, doc_type, page_number)
    return Response(content=image_bytes, media_type="image/png")
