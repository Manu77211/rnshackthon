from services.pr_review_service import _scan_patch, analyze_pull_request


def test_scan_patch_detects_security_findings() -> None:
    patch = "\n".join(
        [
            "@@ -1,2 +1,3 @@",
            " const id = req.query.id;",
            "+const sql = `SELECT * FROM users WHERE id = ${id}`;",
            "+document.write(req.query.content);",
        ]
    )

    findings = _scan_patch("src/routes/userRoutes.js", patch)

    risk_types = {item["risk_type"] for item in findings}
    assert "sql_injection" in risk_types
    assert "xss" in risk_types


async def _fake_read_json(path: str) -> dict | list:
    path_str = str(path)
    if path_str.endswith("chunks.json"):
        return [
            {
                "chunk_type": "function",
                "chunk_name": "getUser",
                "file_path": "src/routes/userRoutes.js",
                "code_text": "function getUser(req, res) { const sql = req.query.id; }",
                "metadata": {},
            }
        ]
    return {
        "project_id": "demo-project",
        "nodes": [
            {
                "id": "file:src/routes/userRoutes.js",
                "type": "file",
                "name": "userRoutes.js",
                "file_path": "src/routes/userRoutes.js",
            }
        ],
        "edges": [],
        "stats": {},
    }


async def _fake_rank_chunks(_chunks, _query, limit=3, allowed_types=None, path_hints=None):
    return (
        "codebert:test",
        [
            {
                "file_path": "src/routes/userRoutes.js",
                "chunk_name": "getUser",
                "chunk_type": "function",
                "similarity_score": 0.84,
                "code_text": "function getUser(req, res) { ... }",
                "reason": "semantic",
            }
        ],
    )


def test_analyze_pull_request_returns_ranked_findings(monkeypatch) -> None:
    monkeypatch.setattr(
        "services.pr_review_service._fetch_pr_meta",
        lambda *_args, **_kwargs: {"title": "Fix auth checks"},
    )
    monkeypatch.setattr(
        "services.pr_review_service._fetch_pr_files",
        lambda *_args, **_kwargs: [
            {
                "filename": "src/routes/userRoutes.js",
                "patch": "@@ -1,1 +1,2 @@\n+const sql = `SELECT * FROM users WHERE id = ${id}`;",
            }
        ],
    )
    monkeypatch.setattr("services.pr_review_service.read_json", _fake_read_json)
    monkeypatch.setattr("services.pr_review_service.rank_chunks", _fake_rank_chunks)
    monkeypatch.setattr("services.pr_review_service._openai_review", lambda _prompt: None)
    monkeypatch.setattr("services.pr_review_service.chunks_file", lambda *_args: "chunks.json")
    monkeypatch.setattr("services.pr_review_service.project_file", lambda *_args: "project.json")

    result = __import__("asyncio").run(
        analyze_pull_request(
            org_id="demo-org",
            project_id="demo-project",
            pr_url="https://github.com/example/repo/pull/7",
            include_ai=True,
            max_findings=10,
        )
    )

    assert result["pr_number"] == 7
    assert result["summary"]["total"] == 1
    assert result["findings"][0]["risk_type"] == "sql_injection"
    assert result["findings"][0]["references"][0]["chunk_name"] == "getUser"
