import io
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from fastapi import HTTPException, UploadFile, status
from PIL import Image
import pypdfium2 as pdfium

from app.schemas.document import DocumentInfo, JobResponse, PageInfo

# Maximum file size: 10MB
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}

class DocumentStorage:
    def __init__(self):
        # job_id -> JobResponse
        self.jobs: Dict[str, JobResponse] = {}
        # job_id -> doc_type -> page_num -> PNG bytes
        self.page_images: Dict[str, Dict[str, Dict[int, bytes]]] = {}

    def save_job(self, job: JobResponse, page_images: Dict[str, Dict[int, bytes]]):
        self.jobs[job.job_id] = job
        self.page_images[job.job_id] = page_images

    def get_job(self, job_id: str) -> JobResponse:
        if job_id not in self.jobs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found."
            )
        return self.jobs[job_id]

    def get_page_image(self, job_id: str, doc_type: str, page_number: int) -> bytes:
        if job_id not in self.page_images:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found."
            )
        if doc_type not in self.page_images[job_id]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document type {doc_type} not found in job."
            )
        if page_number not in self.page_images[job_id][doc_type]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Page {page_number} not found for {doc_type}."
            )
        return self.page_images[job_id][doc_type][page_number]


storage = DocumentStorage()


class DocumentService:
    @staticmethod
    async def validate_file(file: UploadFile) -> bytes:
        content_type = file.content_type or ""
        if content_type.lower() not in ALLOWED_MIME_TYPES and not file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg', '.webp')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type '{content_type}' for {file.filename}. Only PDF and Images (PNG, JPG, WEBP) are supported."
            )

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is empty."
            )

        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File {file.filename} exceeds 10MB limit ({(len(content)/(1024*1024)):.2f}MB)."
            )

        return content

    @staticmethod
    def process_file_content(
        job_id: str,
        doc_type: str,
        filename: str,
        content_type: str,
        content: bytes
    ) -> Tuple[DocumentInfo, Dict[int, bytes]]:
        doc_id = str(uuid.uuid4())
        page_images: Dict[int, bytes] = {}
        pages_meta: List[PageInfo] = []

        is_pdf = (
            content_type == "application/pdf"
            or filename.lower().endswith(".pdf")
            or content.startswith(b"%PDF")
        )

        if is_pdf:
            try:
                pdf = pdfium.PdfDocument(content)
                total_pages = len(pdf)
                for i in range(total_pages):
                    page_num = i + 1
                    page = pdf[i]
                    # Render page at 2.0x scale (~144 DPI) for crisp text & diagrams
                    rendered_image = page.render(scale=2.0).to_pil()
                    
                    img_byte_arr = io.BytesIO()
                    rendered_image.save(img_byte_arr, format="PNG")
                    img_bytes = img_byte_arr.getvalue()

                    page_images[page_num] = img_bytes
                    pages_meta.append(
                        PageInfo(
                            page_number=page_num,
                            width=rendered_image.width,
                            height=rendered_image.height,
                            image_url=f"/api/documents/{job_id}/pages/{doc_type}/{page_num}"
                        )
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error parsing PDF {filename}: {str(e)}"
                )
        else:
            # Handle Direct Image
            try:
                image = Image.open(io.BytesIO(content))
                if image.mode != "RGB":
                    image = image.convert("RGB")
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format="PNG")
                img_bytes = img_byte_arr.getvalue()

                page_images[1] = img_bytes
                pages_meta.append(
                    PageInfo(
                        page_number=1,
                        width=image.width,
                        height=image.height,
                        image_url=f"/api/documents/{job_id}/pages/{doc_type}/1"
                    )
                )
                total_pages = 1
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error reading image {filename}: {str(e)}"
                )

        doc_info = DocumentInfo(
            document_id=doc_id,
            filename=filename,
            content_type=content_type or "application/octet-stream",
            file_size=len(content),
            total_pages=total_pages,
            pages=pages_meta
        )

        return doc_info, page_images

    @classmethod
    async def process_ingestion(
        cls,
        question_paper: UploadFile,
        answer_sheet: UploadFile
    ) -> JobResponse:
        qp_content = await cls.validate_file(question_paper)
        as_content = await cls.validate_file(answer_sheet)

        job_id = str(uuid.uuid4())

        qp_info, qp_images = cls.process_file_content(
            job_id=job_id,
            doc_type="question_paper",
            filename=question_paper.filename or "question_paper.pdf",
            content_type=question_paper.content_type or "application/pdf",
            content=qp_content
        )

        as_info, as_images = cls.process_file_content(
            job_id=job_id,
            doc_type="answer_sheet",
            filename=answer_sheet.filename or "answer_sheet.pdf",
            content_type=answer_sheet.content_type or "application/pdf",
            content=as_content
        )

        job_response = JobResponse(
            job_id=job_id,
            status="ingested",
            question_paper=qp_info,
            answer_sheet=as_info,
            created_at=datetime.now(timezone.utc).isoformat()
        )

        storage.save_job(
            job_response,
            {
                "question_paper": qp_images,
                "answer_sheet": as_images
            }
        )

        return job_response
