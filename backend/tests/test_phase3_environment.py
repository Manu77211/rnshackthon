import json

from services.environment_service import _calculate_health_score, scan_environment


def test_calculate_health_score_floor() -> None:
    assert _calculate_health_score(0) == 100
    assert _calculate_health_score(3) == 70
    assert _calculate_health_score(30) == 0


async def _run_scan(monkeypatch, tmp_path):
    backend = tmp_path / "backend"
    frontend = tmp_path / "frontend"
    backend.mkdir(parents=True)
    frontend.mkdir(parents=True)

    (backend / "requirements.txt").write_text("fastapi==0.111.0\npytest==8.3.3\n", encoding="utf-8")
    (frontend / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"react": "19.0.0"},
                "devDependencies": {"typescript": "5.0.0"},
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr("services.environment_service._workspace_root", lambda: tmp_path)
    monkeypatch.setattr("services.environment_service._installed_python", lambda: {"fastapi"})
    monkeypatch.setattr("services.environment_service._installed_node", lambda _path: {"react"})
    monkeypatch.setattr(
        "services.environment_service._system_info",
        lambda _root: {
            "os": "Windows 11",
            "python_version": "3.11.9",
            "node_version": "v20.11.1",
            "git_version": "git version 2.45.0",
            "ram_gb": 16.0,
            "disk_total_gb": 512.0,
            "disk_free_gb": 300.0,
        },
    )
    return await scan_environment()


def test_scan_environment_detects_missing_dependencies(monkeypatch, tmp_path) -> None:
    payload = __import__("asyncio").run(_run_scan(monkeypatch, tmp_path))
    assert payload["dependencies"]["missing_python"] == ["pytest"]
    assert payload["dependencies"]["missing_node"] == ["typescript"]
    assert payload["issues_count"] == 2
    assert payload["health_score"] == 80