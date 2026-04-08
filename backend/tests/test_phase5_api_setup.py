from fastapi.testclient import TestClient

from dependencies.auth import get_org_id
from main import app


def _override_org_id() -> str:
    return "demo-org"


def _with_auth_override() -> TestClient:
    app.dependency_overrides[get_org_id] = _override_org_id
    return TestClient(app)


def test_scan_environment_endpoint(monkeypatch) -> None:
    payload = {
        "health_score": 90,
        "issues_count": 1,
        "system": {
            "os": "Windows 11",
            "python_version": "3.11.9",
            "node_version": "v20.11.1",
            "git_version": "git version 2.45.0",
            "ram_gb": 16.0,
            "disk_total_gb": 512.0,
            "disk_free_gb": 300.0,
        },
        "dependencies": {"missing_python": ["pytest"], "missing_node": []},
    }
    async def _scan_stub():
        return payload

    monkeypatch.setattr("routes.environment.scan_environment", _scan_stub)

    client = _with_auth_override()
    try:
        response = client.get("/api/scan-environment")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["health_score"] == 90


def test_analyze_repo_endpoint(monkeypatch) -> None:
    payload = {
        "project_id": "p1",
        "nodes": [{"id": "file:a.py", "type": "file", "name": "a.py", "file_path": "a.py"}],
        "edges": [],
        "stats": {"files": 1, "functions": 0, "classes": 0, "import_edges": 0, "call_edges": 0},
    }
    async def _analyze_stub(_org: str, _proj: str):
        return payload

    monkeypatch.setattr("routes.analyze.analyze_repo", _analyze_stub)

    client = _with_auth_override()
    try:
        response = client.get("/api/analyze-repo", params={"project_id": "p1"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["project_id"] == "p1"


def test_git_summary_endpoint(monkeypatch) -> None:
    payload = {
        "project_id": "p1",
        "commit_count": 2,
        "clusters": [
            {
                "cluster_id": "cluster_1",
                "author": "Dev",
                "day": "2026-04-08",
                "commit_count": 2,
                "files": ["app/main.py"],
                "summary": "2 commits by Dev on 2026-04-08 touching 1 files",
            }
        ],
    }
    async def _summary_stub(_org: str, _proj: str):
        return payload

    monkeypatch.setattr("routes.git_summary.summarize_git_history", _summary_stub)

    client = _with_auth_override()
    try:
        response = client.get("/api/git-summary", params={"project_id": "p1"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["commit_count"] == 2
