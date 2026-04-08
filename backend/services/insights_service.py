import json
import os
from typing import Any
from urllib import request
from urllib.error import URLError
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
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


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
    llm = _openai_json(prompt)
    if llm:
        summary = str(llm.get("summary", base["summary"]))
        root = str(llm.get("probable_root_cause", base["probable_root_cause"]))
        items = llm.get("action_items", base["action_items"])
        action_items = [str(item) for item in items][:3]
        provider = "openai:gpt-4o-mini"
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
