import json
import os
import re
from typing import Any
from urllib import error, request

from services.aws_deepseek_service import deepseek_text
from services.project_store import chunks_file, read_json


def _tokens(value: str) -> set[str]:
    raw = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]{2,}", value.lower())
    stop = {
        "the", "and", "for", "with", "this", "that", "from", "into", "your",
        "what", "where", "when", "which", "have", "has", "was", "were", "are",
        "you", "not", "but", "how", "why", "can", "could", "would", "should",
    }
    return {token for token in raw if token not in stop}


def _score(question_tokens: set[str], chunk: dict) -> float:
    haystack = " ".join(
        [
            str(chunk.get("file_path", "")),
            str(chunk.get("chunk_name", "")),
            str(chunk.get("code_text", "")),
        ]
    ).lower()
    chunk_tokens = _tokens(haystack)
    if not question_tokens or not chunk_tokens:
        return 0.0
    overlap = question_tokens.intersection(chunk_tokens)
    return len(overlap) / (len(question_tokens) ** 0.7)


def _rank_chunks(question: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    query_tokens = _tokens(question)
    ranked = sorted(
        (
            {
                "file_path": str(chunk.get("file_path", "")),
                "chunk_name": str(chunk.get("chunk_name", "")),
                "similarity_score": round(_score(query_tokens, chunk), 4),
                "code_text": str(chunk.get("code_text", "")),
            }
            for chunk in chunks
        ),
        key=lambda item: item["similarity_score"],
        reverse=True,
    )
    return [item for item in ranked if item["similarity_score"] > 0][:4]


def _fallback_answer(question: str, top: list[dict[str, Any]]) -> str:
    primary = top[0]
    first_line = primary["code_text"].strip().splitlines()
    excerpt = first_line[0] if first_line else ""
    excerpt_text = f" Code excerpt: {excerpt[:140]}" if excerpt else ""
    follow_ups = ", ".join(f"{item['file_path']}::{item['chunk_name']}" for item in top[1:3])
    if follow_ups:
        return (
            f"Based on the indexed code, the best starting point for '{question}' is "
            f"{primary['file_path']}::{primary['chunk_name']}.{excerpt_text} "
            f"Related areas to check next: {follow_ups}."
        )
    return (
        f"Based on the indexed code, the best starting point for '{question}' is "
        f"{primary['file_path']}::{primary['chunk_name']}.{excerpt_text}"
    )


def _build_prompt(question: str, top: list[dict[str, Any]]) -> str:
    context_lines: list[str] = []
    for index, item in enumerate(top, start=1):
        snippet = item["code_text"][:900]
        context_lines.append(
            f"[{index}] {item['file_path']}::{item['chunk_name']} score={item['similarity_score']}\n{snippet}"
        )
    context = "\n\n".join(context_lines)
    return (
        "You are a senior repository assistant. "
        "Answer using only the provided context snippets. "
        "If the context is insufficient, say exactly what is missing.\n\n"
        f"Question:\n{question}\n\n"
        f"Code context:\n{context}\n\n"
        "Return plain text only, concise and actionable."
    )


def _extract_gemini_text(body: dict[str, Any]) -> str:
    candidates = body.get("candidates", [])
    if not isinstance(candidates, list) or not candidates:
        return ""
    first = candidates[0] if isinstance(candidates[0], dict) else {}
    content = first.get("content", {}) if isinstance(first, dict) else {}
    parts = content.get("parts", []) if isinstance(content, dict) else []
    text_parts: list[str] = []
    for part in parts:
        if isinstance(part, dict):
            text = str(part.get("text", "")).strip()
            if text:
                text_parts.append(text)
    return "\n".join(text_parts).strip()


def _gemini_answer(prompt: str) -> tuple[str | None, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None, "missing-key"
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2},
    }
    req = request.Request(
        url,
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return None, f"http-{exc.code}"
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None, "network-or-parse-failure"
    text = _extract_gemini_text(body)
    if not text:
        return None, "empty-response"
    return text, "ok"


async def ask_repository(org_id: str, project_id: str, question: str) -> dict:
    chunks = await read_json(chunks_file(org_id, project_id))
    if not chunks:
        raise FileNotFoundError("Project chunks not found")

    top = _rank_chunks(question, [item for item in chunks if isinstance(item, dict)])
    if not top:
        return {
            "answer": "No strong match was found. Try asking about a file, function, or framework symbol.",
            "references": [],
        }

    prompt = _build_prompt(question, top)
    deepseek_answer, deepseek_error, _provider = deepseek_text(prompt)
    if deepseek_answer:
        answer = deepseek_answer
    else:
        llm_answer, llm_status = _gemini_answer(prompt)
        if llm_answer:
            answer = llm_answer
        else:
            fallback = _fallback_answer(question, top)
            deepseek_missing = deepseek_error == "missing-gateway-config"
            if llm_status in {"missing-key", "ok"} and deepseek_missing:
                answer = fallback
            else:
                answer = f"AI response unavailable (aws={deepseek_error}, gemini={llm_status}). {fallback}"
    return {
        "answer": answer,
        "references": [
            {
                "file_path": item["file_path"],
                "chunk_name": item["chunk_name"],
                "similarity_score": item["similarity_score"],
            }
            for item in top
        ],
    }
