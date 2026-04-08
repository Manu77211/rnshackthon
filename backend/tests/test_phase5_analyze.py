import json

from services.analyze_service import analyze_repo


def _run_analyze(monkeypatch, tmp_path):
    payload = {
        "project_id": "p1",
        "nodes": [{"id": "file:a.py", "type": "file", "name": "a.py", "file_path": "a.py"}],
        "edges": [],
        "stats": {"files": 1, "functions": 0, "classes": 0, "import_edges": 0, "call_edges": 0},
    }
    path = tmp_path / "project.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    monkeypatch.setattr("services.analyze_service.project_file", lambda _org, _project: path)
    return __import__("asyncio").run(analyze_repo("demo-org", "p1"))


def test_analyze_repo_returns_stored_graph(monkeypatch, tmp_path) -> None:
    result = _run_analyze(monkeypatch, tmp_path)
    assert result["project_id"] == "p1"
    assert result["stats"]["files"] == 1