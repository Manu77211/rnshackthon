import asyncio
import io
import shutil
import subprocess
import zipfile
from pathlib import Path
from uuid import uuid4
from models.schemas import StatusResponse
from services.embedding_service import attach_embeddings_to_chunks
from services.graph_builder import build_graph_from_chunks
from services.parser import discover_files, parse_file
from services.project_store import chunks_file, project_file, source_dir, write_json
from services.status_store import write_status


def generate_project_id() -> str:
    return uuid4().hex[:12]


def _prepare_source_folder(org_id: str, project_id: str) -> Path:
    folder = source_dir(org_id, project_id)
    if folder.exists():
        shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _extract_zip(raw: bytes, target: Path) -> None:
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        archive.extractall(target)


def _clone_repo(repo_url: str, branch: str, target: Path) -> None:
    cmd = ["git", "clone", repo_url, str(target), "--depth", "1", "--branch", branch]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Failed to clone repository")


def _parse_chunks(root: Path) -> tuple[int, list[dict]]:
    files = discover_files(root)
    chunks: list[dict] = []
    for file_path in files:
        chunks.extend(parse_file(file_path, root))
    for index, chunk in enumerate(chunks):
        chunk["id"] = f"chunk_{index + 1}"
    return len(files), chunks


async def run_ingestion_pipeline(
    org_id: str,
    project_id: str,
    zip_bytes: bytes | None,
    repo_url: str | None,
    branch: str,
) -> None:
    await write_status(
        org_id,
        StatusResponse(project_id=project_id, status="parsing", progress=25),
    )
    source = _prepare_source_folder(org_id, project_id)
    if zip_bytes is not None:
        await asyncio.to_thread(_extract_zip, zip_bytes, source)
    elif repo_url:
        await asyncio.to_thread(_clone_repo, repo_url, branch, source)
    else:
        raise RuntimeError("No source provided for ingestion")

    await write_status(
        org_id,
        StatusResponse(project_id=project_id, status="embedding", progress=55),
    )
    file_count, chunks = await asyncio.to_thread(_parse_chunks, source)
    embedding_backend = await attach_embeddings_to_chunks(chunks)

    await write_status(
        org_id,
        StatusResponse(project_id=project_id, status="storing", progress=82),
    )
    graph = build_graph_from_chunks(project_id, chunks)
    graph["embedding_backend"] = embedding_backend
    await write_json(chunks_file(org_id, project_id), chunks)
    await write_json(project_file(org_id, project_id), graph)
    await write_json(
        source.parent / f"{org_id}__{project_id}__meta.json",
        {
            "project_id": project_id,
            "file_count": file_count,
            "chunk_count": len(chunks),
            "graph_nodes": len(graph.get("nodes", [])),
            "graph_edges": len(graph.get("edges", [])),
            "embedding_backend": embedding_backend,
        },
    )

    await write_status(
        org_id,
        StatusResponse(project_id=project_id, status="complete", progress=100),
    )


async def queue_initial_status(org_id: str, project_id: str) -> None:
    await write_status(
        org_id,
        StatusResponse(project_id=project_id, status="queued", progress=5),
    )


async def fail_status(org_id: str, project_id: str) -> None:
    await write_status(
        org_id,
        StatusResponse(project_id=project_id, status="failed", progress=100),
    )


async def process_with_guard(
    org_id: str,
    project_id: str,
    zip_bytes: bytes | None,
    repo_url: str | None,
    branch: str,
) -> None:
    try:
        await run_ingestion_pipeline(org_id, project_id, zip_bytes, repo_url, branch)
    except Exception:
        await write_status(
            org_id,
            StatusResponse(project_id=project_id, status="failed", progress=100),
        )
