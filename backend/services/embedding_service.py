import asyncio
import math
import os
import re
from typing import Any


_MODEL_NAME = os.getenv("CODE_EMBEDDING_MODEL", "microsoft/codebert-base")
_runtime: dict[str, Any] | None = None
_runtime_error: str | None = None


def _clean_text(value: str, max_chars: int = 1800) -> str:
    return (value or "").strip()[:max_chars]


def _tokens(text: str) -> list[str]:
    return re.findall(r"[A-Za-z_][A-Za-z0-9_]+", text.lower())


def _normalize(values: list[float]) -> list[float]:
    size = math.sqrt(sum(item * item for item in values))
    if size <= 1e-12:
        return [0.0 for _ in values]
    return [item / size for item in values]


def _cosine(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    return max(0.0, min(1.0, sum(a * b for a, b in zip(left, right))))


def _token_overlap(query_text: str, target_text: str) -> float:
    query = set(_tokens(query_text))
    target = set(_tokens(target_text))
    if not query or not target:
        return 0.0
    overlap = len(query.intersection(target))
    return overlap / max(len(query), 1)


def _fallback_embedding(text: str, dims: int = 256) -> list[float]:
    vector = [0.0] * dims
    for token in _tokens(text):
        slot = hash(token) % dims
        vector[slot] += 1.0
    return _normalize(vector)


def _load_runtime() -> dict[str, Any] | None:
    global _runtime, _runtime_error
    if _runtime is not None:
        return _runtime
    if _runtime_error is not None:
        return None
    try:
        from transformers import AutoModel, AutoTokenizer
        import torch
    except Exception as exc:  # pragma: no cover - runtime dependency path
        _runtime_error = str(exc)
        return None
    tokenizer = AutoTokenizer.from_pretrained(_MODEL_NAME)
    model = AutoModel.from_pretrained(_MODEL_NAME)
    model.eval()
    _runtime = {"tokenizer": tokenizer, "model": model, "torch": torch}
    return _runtime


def embed_texts_sync(texts: list[str]) -> tuple[str, list[list[float]]]:
    runtime = _load_runtime()
    cleaned = [_clean_text(item) for item in texts]
    if runtime is None:
        vectors = [_fallback_embedding(item) for item in cleaned]
        return "fallback-hash-v1", vectors
    torch = runtime["torch"]
    tokenizer = runtime["tokenizer"]
    model = runtime["model"]
    encoded = tokenizer(cleaned, padding=True, truncation=True, max_length=256, return_tensors="pt")
    with torch.no_grad():
        output = model(**encoded)
    mask = encoded["attention_mask"].unsqueeze(-1)
    masked = output.last_hidden_state * mask
    summed = masked.sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1)
    vectors = (summed / counts).tolist()
    return f"codebert:{_MODEL_NAME}", [_normalize([float(item) for item in vec]) for vec in vectors]


async def embed_texts(texts: list[str]) -> tuple[str, list[list[float]]]:
    return await asyncio.to_thread(embed_texts_sync, texts)


def _as_embedding(value: Any) -> list[float] | None:
    if not isinstance(value, list) or not value:
        return None
    output: list[float] = []
    for item in value:
        if not isinstance(item, (int, float)):
            return None
        output.append(float(item))
    return _normalize(output)


async def attach_embeddings_to_chunks(chunks: list[dict[str, Any]]) -> str:
    indexes = [i for i, chunk in enumerate(chunks) if chunk.get("chunk_type") == "function"]
    if not indexes:
        return "none"
    texts = [str(chunks[i].get("code_text", "")) for i in indexes]
    backend, vectors = await embed_texts(texts)
    for idx, vector in zip(indexes, vectors):
        metadata = chunks[idx].setdefault("metadata", {})
        metadata["embedding"] = [round(value, 6) for value in vector]
        metadata["embedding_backend"] = backend
    return backend


def _path_boost(file_path: str, path_hints: set[str] | None) -> float:
    if not path_hints:
        return 0.0
    normalized = file_path.replace("\\", "/")
    return 0.18 if any(hint in normalized for hint in path_hints) else 0.0


async def rank_chunks(
    chunks: list[dict[str, Any]],
    query_text: str,
    limit: int,
    allowed_types: set[str] | None = None,
    path_hints: set[str] | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    candidates = [chunk for chunk in chunks if not allowed_types or chunk.get("chunk_type") in allowed_types]
    if not candidates:
        return "none", []

    query_backend, query_vectors = await embed_texts([query_text])
    query_vector = query_vectors[0]
    missing_indexes: list[int] = []
    missing_texts: list[str] = []
    vectors: list[list[float] | None] = []

    for index, chunk in enumerate(candidates):
        metadata = chunk.get("metadata", {})
        embedded = _as_embedding(metadata.get("embedding"))
        if embedded and metadata.get("embedding_backend") == query_backend:
            vectors.append(embedded)
            continue
        vectors.append(None)
        missing_indexes.append(index)
        missing_texts.append(str(chunk.get("code_text", "")))

    if missing_indexes:
        _, missing_vectors = await embed_texts(missing_texts)
        for idx, vector in zip(missing_indexes, missing_vectors):
            vectors[idx] = vector

    ranked: list[dict[str, Any]] = []
    for chunk, vector in zip(candidates, vectors):
        semantic = _cosine(query_vector, vector or [])
        lexical = _token_overlap(query_text, str(chunk.get("code_text", "")))
        score = min(1.0, semantic * 0.85 + lexical * 0.15 + _path_boost(str(chunk.get("file_path", "")), path_hints))
        ranked.append(
            {
                "file_path": str(chunk.get("file_path", "")),
                "chunk_name": str(chunk.get("chunk_name", "unknown")),
                "chunk_type": str(chunk.get("chunk_type", "file")),
                "similarity_score": round(score, 4),
                "code_text": str(chunk.get("code_text", "")),
                "reason": "Code embedding cosine similarity with lexical and path-hint boost",
            }
        )

    ranked.sort(key=lambda item: item["similarity_score"], reverse=True)
    safe_limit = max(1, min(limit, 10))
    return query_backend, ranked[:safe_limit]