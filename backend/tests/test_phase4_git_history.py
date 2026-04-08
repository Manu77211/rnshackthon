from pathlib import Path

from git.exc import GitCommandError

from services.git_history_service import _group_commits, summarize_git_history


def test_group_commits_clusters_by_author_day_and_overlap() -> None:
    commits = [
        {
            "hash": "a1",
            "author": "Dev",
            "date": "2026-04-08T10:00:00",
            "message": "feat one",
            "files": ["app/a.py", "app/b.py"],
        },
        {
            "hash": "a2",
            "author": "Dev",
            "date": "2026-04-08T11:00:00",
            "message": "feat two",
            "files": ["app/b.py"],
        },
        {
            "hash": "a3",
            "author": "Dev",
            "date": "2026-04-09T09:00:00",
            "message": "next day",
            "files": ["app/c.py"],
        },
    ]
    clusters = _group_commits(commits)
    assert len(clusters) == 2
    assert clusters[0]["commit_count"] == 2
    assert "app/b.py" in clusters[0]["files"]


def _run_git_summary(monkeypatch, tmp_path: Path):
    repo_root = tmp_path / "repo"
    repo_root.mkdir(parents=True)
    (repo_root / ".git").mkdir()

    monkeypatch.setattr(
        "services.git_history_service.source_dir",
        lambda _org, _project: repo_root,
    )
    monkeypatch.setattr(
        "services.git_history_service._extract_commits",
        lambda _path: [
            {
                "hash": "abc123",
                "author": "Dev",
                "date": "2026-04-08T10:00:00",
                "message": "initial",
                "files": ["app/main.py"],
            }
        ],
    )
    return __import__("asyncio").run(summarize_git_history("demo-org", "demo-proj"))


def test_summarize_git_history_returns_clusters(monkeypatch, tmp_path: Path) -> None:
    payload = _run_git_summary(monkeypatch, tmp_path)
    assert payload["project_id"] == "demo-proj"
    assert payload["commit_count"] == 1
    assert payload["clusters"][0]["commit_count"] == 1


def test_extract_commits_handles_missing_parent_objects(monkeypatch) -> None:
    class BrokenStats:
        @property
        def files(self):
            raise GitCommandError("git diff", 128, stderr="fatal: bad object deadbeef")

    class StubCommit:
        hexsha = "1234567890abcdef"
        author = type("Author", (), {"name": "Dev"})()
        committed_datetime = __import__("datetime").datetime(2026, 4, 8, 10, 0, 0)
        message = "broken parent"
        stats = BrokenStats()

    class StubRepo:
        def iter_commits(self, max_count=200):
            return [StubCommit()]

    monkeypatch.setattr("services.git_history_service.Repo", lambda _path: StubRepo())
    extract = __import__("services.git_history_service", fromlist=["_extract_commits"])._extract_commits
    output = extract("ignored-path")

    assert len(output) == 1
    assert output[0]["files"] == []