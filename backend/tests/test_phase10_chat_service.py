import asyncio
import json

from services.chat_service import ask_repository


async def _fake_read_json(_path):
    return [
        {
            "file_path": "app/main.py",
            "chunk_name": "create_app",
            "code_text": "def create_app():\n    app = FastAPI()\n    return app",
        },
        {
            "file_path": "app/api/auth.py",
            "chunk_name": "verify_token",
            "code_text": "def verify_token(token):\n    return token is not None",
        },
    ]


def test_chat_returns_fallback_answer_without_model_key(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    monkeypatch.delenv("access_key", raising=False)
    monkeypatch.delenv("secret_key", raising=False)
    monkeypatch.delenv("API_GATEWAY_URL", raising=False)
    monkeypatch.setattr("services.chat_service.read_json", _fake_read_json)
    monkeypatch.setattr("services.chat_service.chunks_file", lambda *_args: "chunks.json")
    monkeypatch.setattr("services.chat_service.deepseek_text", lambda _prompt: (None, "missing-gateway-config", ""))

    result = asyncio.run(
        ask_repository(
            org_id="demo-org",
            project_id="demo-project",
            question="Where is auth token verified in this project?",
        )
    )

    assert "best starting point" in result["answer"]
    assert len(result["references"]) > 0


def test_chat_uses_gemini_when_key_is_configured(monkeypatch) -> None:
    class _Response:
        def __init__(self, payload: bytes):
            self._payload = payload

        def read(self) -> bytes:
            return self._payload

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    def _fake_urlopen(_req, timeout=30):  # noqa: ARG001
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Token checks are in app/api/auth.py::verify_token."}
                        ]
                    }
                }
            ]
        }
        return _Response(json.dumps(payload).encode("utf-8"))

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    monkeypatch.delenv("access_key", raising=False)
    monkeypatch.delenv("secret_key", raising=False)
    monkeypatch.delenv("API_GATEWAY_URL", raising=False)
    monkeypatch.setattr("services.chat_service.read_json", _fake_read_json)
    monkeypatch.setattr("services.chat_service.request.urlopen", _fake_urlopen)
    monkeypatch.setattr("services.chat_service.chunks_file", lambda *_args: "chunks.json")
    monkeypatch.setattr("services.chat_service.deepseek_text", lambda _prompt: (None, "missing-gateway-config", ""))

    result = asyncio.run(
        ask_repository(
            org_id="demo-org",
            project_id="demo-project",
            question="Where is auth token verified in this project?",
        )
    )

    assert "verify_token" in result["answer"]


def test_chat_returns_no_match_message(monkeypatch) -> None:
    async def _read_json(_path):
        return [{"file_path": "app/a.py", "chunk_name": "x", "code_text": "alpha beta"}]

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    monkeypatch.delenv("access_key", raising=False)
    monkeypatch.delenv("secret_key", raising=False)
    monkeypatch.delenv("API_GATEWAY_URL", raising=False)
    monkeypatch.setattr("services.chat_service.read_json", _read_json)
    monkeypatch.setattr("services.chat_service.chunks_file", lambda *_args: "chunks.json")
    monkeypatch.setattr("services.chat_service.deepseek_text", lambda _prompt: (None, "missing-gateway-config", ""))

    result = asyncio.run(
        ask_repository(
            org_id="demo-org",
            project_id="demo-project",
            question="Where is kubernetes ingress configured?",
        )
    )

    assert "No strong match" in result["answer"]
    assert result["references"] == []
