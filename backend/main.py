import asyncio
import sys

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from routes.analyze import router as analyze_router
from routes.chat import router as chat_router
from routes.diagnose import router as diagnose_router
from routes.environment import router as environment_router
from routes.explorer import router as explorer_router
from routes.git_summary import router as git_summary_router
from routes.ingest import router as ingest_router
from routes.insights import router as insights_router
from routes.map import router as map_router
from routes.sandbox import router as sandbox_router
from routes.similarity import router as similarity_router
from routes.status import router as status_router
from utils.errors import error_response

load_dotenv()

if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    # Avoid Proactor transport reset noise on abrupt client disconnects.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

app = FastAPI(title="CodeLens AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router, prefix="/api")
app.include_router(environment_router, prefix="/api")
app.include_router(git_summary_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")
app.include_router(status_router, prefix="/api")
app.include_router(map_router, prefix="/api")
app.include_router(diagnose_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(explorer_router, prefix="/api")
app.include_router(sandbox_router, prefix="/api")
app.include_router(similarity_router, prefix="/api")
app.include_router(insights_router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def handle_http_exception(_: Request, exc: HTTPException) -> JSONResponse:
    return error_response("request_error", exc.status_code, str(exc.detail))


@app.exception_handler(Exception)
async def handle_unexpected(_: Request, __: Exception) -> JSONResponse:
    return error_response("internal_error", 500, "Unexpected server error")
