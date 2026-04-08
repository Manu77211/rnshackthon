import json
from pathlib import Path
import aiofiles


BASE_DIR = Path(__file__).resolve().parent.parent
RUNTIME_DIR = BASE_DIR / "runtime"
PROJECTS_DIR = RUNTIME_DIR / "projects"
CHUNKS_DIR = RUNTIME_DIR / "chunks"
SOURCES_DIR = RUNTIME_DIR / "sources"
FIXES_DIR = RUNTIME_DIR / "fixes"


def _safe(value: str) -> str:
    return value.replace("/", "_").replace("\\", "_")


def project_file(org_id: str, project_id: str) -> Path:
    return PROJECTS_DIR / f"{_safe(org_id)}__{_safe(project_id)}.json"


def chunks_file(org_id: str, project_id: str) -> Path:
    return CHUNKS_DIR / f"{_safe(org_id)}__{_safe(project_id)}.json"


def source_dir(org_id: str, project_id: str) -> Path:
    return SOURCES_DIR / f"{_safe(org_id)}__{_safe(project_id)}"


def fix_dir(org_id: str, project_id: str) -> Path:
    return FIXES_DIR / f"{_safe(org_id)}__{_safe(project_id)}"


async def write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, "w", encoding="utf-8") as file:
        await file.write(json.dumps(payload, ensure_ascii=True))


async def read_json(path: Path) -> dict | list:
    async with aiofiles.open(path, "r", encoding="utf-8") as file:
        raw = await file.read()
    return json.loads(raw)
