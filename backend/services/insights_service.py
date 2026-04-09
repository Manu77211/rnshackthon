import json
import os
import re
from typing import Any
from urllib import error, request
from services.aws_deepseek_service import deepseek_json
from services.diagnose_service import diagnose_error


def _fallback_summary(error_text: str, refs: list[dict[str, Any]]) -> dict[str, Any]:
    first = refs[0] if refs else {"file_path": "unknown", "chunk_name": "unknown"}
    return {
        "summary": "Likely failure path identified from semantic overlap and stack context.",
        "probable_root_cause": (
            f"Most likely source is {first['file_path']}::{first['chunk_name']} based on token overlap with the error trace."
        ),
        "action_items": [
            "Review the highlighted function logic and recent changes.",
            "Add a focused test around this failure path.",
            "Validate input and null/edge conditions before dependent calls.",
        ],
        "provider": "fallback-template",
    }


def _openai_prompt(error_text: str, refs: list[dict[str, Any]]) -> str:
    ref_lines = [
        f"- {item['file_path']}::{item['chunk_name']} score={item['similarity_score']}"
        for item in refs
    ]
    refs_text = "\n".join(ref_lines)
    return (
        "You are an expert code debugger. Return strict JSON with keys: "
        "summary (string), probable_root_cause (string), action_items (array of 3 short strings).\n"
        f"Error trace:\n{error_text}\n\nTop references:\n{refs_text}"
    )


def _openai_json(prompt: str) -> dict[str, Any] | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        method="POST",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    return _parse_json_dict(str(content))


def _parse_json_dict(content: str) -> dict[str, Any] | None:
    text = content.strip()
    if not text:
        return None
    try:
        payload = json.loads(text)
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        return None


def _gemini_json(prompt: str) -> tuple[dict[str, Any] | None, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None, ""
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    req = request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (error.HTTPError, error.URLError, TimeoutError, json.JSONDecodeError):
        return None, model
    candidates = body.get("candidates", [])
    if not isinstance(candidates, list) or not candidates:
        return None, model
    content = candidates[0].get("content", {}) if isinstance(candidates[0], dict) else {}
    parts = content.get("parts", []) if isinstance(content, dict) else []
    text = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict))
    return _parse_json_dict(text), model


def _provider_json(prompt: str) -> tuple[dict[str, Any] | None, str]:
    deepseek_payload, deepseek_error, deepseek_provider = deepseek_json(prompt)
    if deepseek_payload:
        return deepseek_payload, deepseek_provider or "aws-deepseek"
    openai = _openai_json(prompt)
    if openai:
        return openai, "openai:gpt-4o-mini"
    gemini, model = _gemini_json(prompt)
    if gemini:
        return gemini, f"gemini:{model}"
    if deepseek_error and deepseek_error != "missing-gateway-config":
        return None, f"fallback-template ({deepseek_error})"
    return None, "fallback-template"


async def generate_insights(
    org_id: str,
    project_id: str,
    error_text: str,
    top_k: int,
) -> dict[str, Any]:
    diagnosis = await diagnose_error(org_id, project_id, error_text)
    refs = diagnosis.get("results", [])[:top_k]
    base = _fallback_summary(error_text, refs)

    prompt = _openai_prompt(error_text, refs)
    llm, provider = _provider_json(prompt)
    if llm:
        summary = str(llm.get("summary", base["summary"]))
        root = str(llm.get("probable_root_cause", base["probable_root_cause"]))
        items = llm.get("action_items", base["action_items"])
        action_items = [str(item) for item in items][:3]
    else:
        summary = base["summary"]
        root = base["probable_root_cause"]
        action_items = base["action_items"]
        provider = base["provider"]

    references = [
        {
            "file_path": str(item.get("file_path", "")),
            "chunk_name": str(item.get("chunk_name", "")),
            "similarity_score": float(item.get("similarity_score", 0.0)),
        }
        for item in refs
    ]
    return {
        "summary": summary,
        "probable_root_cause": root,
        "action_items": action_items,
        "references": references,
        "provider": provider,
    }
