import asyncio

from services.sandbox_ai_service import suggest_fix_draft
from services.sandbox_runtime_service import _resolve_default_command, run_project_check


def test_resolve_default_command_prefers_node_build(tmp_path) -> None:
    (tmp_path / "package.json").write_text("{}", encoding="utf-8")
    profile, command = _resolve_default_command(tmp_path)
    assert profile == "node"
    assert command == "npm run build"


async def _fake_execute(_command, _cwd, _timeout_sec):
    return {
        "exit_code": 1,
        "timed_out": False,
        "duration_ms": 420,
        "stdout": "test stdout",
        "stderr": "TypeError: crash in route",
    }


async def _fake_diagnose(_org, _project, _error_text):
    return {
        "results": [
            {
                "file_path": "src/routes/userRoutes.js",
                "chunk_name": "getUser",
                "chunk_type": "function",
                "code_text": "function getUser(req, res) {}",
                "similarity_score": 0.81,
                "reason": "semantic",
            }
        ]
    }


async def _fake_insights(_org, _project, _error_text, top_k=3):
    return {
        "summary": "Failure likely tied to missing null guard.",
        "probable_root_cause": "getUser does not validate req.query.id",
        "action_items": ["Add null checks", "Add tests", "Validate params"],
        "provider": "fallback-template",
    }


def test_run_project_check_returns_diagnosis(monkeypatch, tmp_path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir(parents=True)
    (repo / "package.json").write_text("{}", encoding="utf-8")

    monkeypatch.setattr("services.sandbox_runtime_service.source_dir", lambda _org, _project: repo)
    monkeypatch.setattr("services.sandbox_runtime_service._execute", _fake_execute)
    monkeypatch.setattr("services.sandbox_runtime_service.diagnose_error", _fake_diagnose)
    monkeypatch.setattr("services.sandbox_runtime_service.generate_insights", _fake_insights)

    payload = asyncio.run(
        run_project_check(
            org_id="demo-org",
            project_id="demo-project",
            command=None,
            timeout_sec=120,
            include_ai_insights=True,
        )
    )

    assert payload["profile"] == "node"
    assert payload["command"] == "npm run build"
    assert payload["exit_code"] == 1
    assert payload["diagnosis"][0]["chunk_name"] == "getUser"
    assert payload["insights"]["summary"]


def test_suggest_fix_draft_uses_model_payload(monkeypatch) -> None:
    monkeypatch.setattr(
        "services.sandbox_ai_service.read_source_file",
        lambda _org, _project, _path: {
            "file_path": "src/app.js",
            "language": "js",
            "content": "function app(){return true}",
        },
    )
    monkeypatch.setattr(
        "services.sandbox_ai_service._provider_json",
        lambda _prompt: (
            {
                "updated_content": "function app(){ if(!process.env.NODE_ENV){ return false; } return true; }",
                "summary": "Added environment guard.",
            },
            "groq:test-model",
            [],
        ),
    )

    payload = asyncio.run(
        suggest_fix_draft(
            org_id="demo-org",
            project_id="demo-project",
            file_path="src/app.js",
            instruction="Fix runtime safety",
            error_text="ReferenceError: NODE_ENV is undefined",
        )
    )

    assert payload["file_path"] == "src/app.js"
    assert "environment guard" in payload["summary"].lower()
    assert "NODE_ENV" in payload["updated_content"]


def test_suggest_fix_draft_returns_fallback_on_provider_failure(monkeypatch) -> None:
    monkeypatch.setattr(
        "services.sandbox_ai_service.read_source_file",
        lambda _org, _project, _path: {
            "file_path": "src/app.js",
            "language": "js",
            "content": "function app(){return true}",
        },
    )
    monkeypatch.setattr(
        "services.sandbox_ai_service._provider_json",
        lambda _prompt: (None, "none", ["openai failed", "groq failed"]),
    )

    payload = asyncio.run(
        suggest_fix_draft(
            org_id="demo-org",
            project_id="demo-project",
            file_path="src/app.js",
            instruction="Fix runtime safety",
            error_text="TypeError in production",
        )
    )

    assert payload["provider"] == "fallback:local-template"
    assert payload["updated_content"] == "function app(){return true}"
