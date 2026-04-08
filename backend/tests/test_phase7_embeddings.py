from services.diagnose_service import diagnose_error
from services.similarity_service import find_similar_functions


def _vector_for(text: str) -> list[float]:
    value = text.lower()
    if "auth" in value or "token" in value:
        return [1.0, 0.0, 0.0]
    if "sql" in value or "query" in value:
        return [0.0, 1.0, 0.0]
    return [0.0, 0.0, 1.0]


async def _fake_embed_texts(texts: list[str]) -> tuple[str, list[list[float]]]:
    return "codebert:test", [_vector_for(item) for item in texts]


async def _fake_read_json(chunks: list[dict], _path: str) -> list[dict]:
    return chunks


def test_similarity_prefers_semantic_match(monkeypatch) -> None:
    chunks = [
        {
            "chunk_type": "function",
            "chunk_name": "build_sql_query",
            "file_path": "src/db/query.py",
            "code_text": "def build_sql_query(filters): return f'SELECT * FROM users WHERE {filters}'",
            "metadata": {},
        },
        {
            "chunk_type": "function",
            "chunk_name": "issue_jwt",
            "file_path": "src/auth/token.py",
            "code_text": "def issue_jwt(user_id): return sign_token(user_id)",
            "metadata": {},
        },
    ]

    monkeypatch.setattr("services.embedding_service.embed_texts", _fake_embed_texts)
    monkeypatch.setattr("services.similarity_service.read_json", lambda _path: _fake_read_json(chunks, _path))
    monkeypatch.setattr("services.similarity_service.chunks_file", lambda _org, _project: "ignored")

    payload = __import__("asyncio").run(
        find_similar_functions("demo-org", "demo-proj", "how is sql query built", 5)
    )

    assert payload["embedding_backend"] == "codebert:test"
    assert payload["results"][0]["chunk_name"] == "build_sql_query"


def test_diagnose_boosts_file_path_hint(monkeypatch) -> None:
    chunks = [
        {
            "chunk_type": "function",
            "chunk_name": "verify_token",
            "file_path": "src/auth/token.py",
            "code_text": "def verify_token(token): return decode(token)",
            "metadata": {},
        },
        {
            "chunk_type": "function",
            "chunk_name": "verify_profile",
            "file_path": "src/user/profile.py",
            "code_text": "def verify_profile(token): return decode(token)",
            "metadata": {},
        },
    ]

    monkeypatch.setattr("services.embedding_service.embed_texts", _fake_embed_texts)
    monkeypatch.setattr("services.diagnose_service.read_json", lambda _path: _fake_read_json(chunks, _path))
    monkeypatch.setattr("services.diagnose_service.chunks_file", lambda _org, _project: "ignored")

    error_text = "TypeError in src/auth/token.py while validating jwt token"
    payload = __import__("asyncio").run(diagnose_error("demo-org", "demo-proj", error_text))

    assert payload["results"][0]["file_path"] == "src/auth/token.py"
    assert payload["results"][0]["similarity_score"] >= payload["results"][1]["similarity_score"]
