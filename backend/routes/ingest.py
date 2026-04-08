import asyncio
import io
import zipfile
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from dependencies.auth import get_org_id
from models.schemas import GithubIngestRequest, IngestResponse
from services.ingest_service import generate_project_id, process_with_guard, queue_initial_status

router = APIRouter(tags=["ingest"])


def _count_zip_entries(data: bytes) -> int:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return len([entry for entry in archive.infolist() if not entry.is_dir()])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_codebase(
    request: Request,
    file: UploadFile | None = File(default=None),
    org_id: str = Depends(get_org_id),
) -> IngestResponse:
    project_id = generate_project_id()
    content_type = request.headers.get("content-type", "")
    repo_url: str | None = None
    branch = "main"
    zip_bytes: bytes | None = None

    if "application/json" in content_type:
        payload = GithubIngestRequest.model_validate(await request.json())
        if "github.com" not in payload.repo_url:
            raise HTTPException(status_code=422, detail="Invalid GitHub URL")
        repo_url = payload.repo_url
        branch = payload.branch
        file_count = 0
    elif file is not None:
        if not file.filename or not file.filename.endswith(".zip"):
            raise HTTPException(status_code=422, detail="Only .zip files are allowed")
        zip_bytes = await file.read()
        file_count = _count_zip_entries(zip_bytes)
    else:
        raise HTTPException(status_code=422, detail="Provide ZIP file or JSON repo_url")

    await queue_initial_status(org_id, project_id)
    asyncio.create_task(
        process_with_guard(org_id, project_id, zip_bytes, repo_url, branch)
    )
    return IngestResponse(project_id=project_id, file_count=file_count, status="processing")
