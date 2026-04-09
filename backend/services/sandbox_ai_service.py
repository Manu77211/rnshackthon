import json
import os
import re
from typing import Any
from urllib import error, request

from services.aws_deepseek_service import deepseek_json
from services.explorer_service import read_source_file


def _parse_json_content(content: str) -> dict[str, Any] | None:
    if not content.strip():
        return None
    try:
        payload = json.loads(content)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _chat_json(
    endpoint: str,
    api_key: str,
    model: str,
    prompt: str,
    enforce_json: bool,
) -> tuple[dict[str, Any] | None, str | None]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    if enforce_json:
        payload["response_format"] = {"type": "json_object"}
    req = request.Request(
        endpoint,
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        return None, f"HTTP {exc.code}: {detail[:280]}"
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None, "network or response parse failure"

    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = _parse_json_content(str(content))
    if parsed is None:
        return None, "model did not return valid JSON"
    return parsed, None


def _gemini_json(prompt: str) -> tuple[dict[str, Any] | None, str | None, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None, None, "missing key"
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
        with request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        return None, model, f"HTTP {exc.code}: {detail[:280]}"
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None, model, "network or response parse failure"

    candidates = body.get("candidates", [])
    if not isinstance(candidates, list) or not candidates:
        return None, model, "model did not return candidates"
    content = candidates[0].get("content", {}) if isinstance(candidates[0], dict) else {}
    parts = content.get("parts", []) if isinstance(content, dict) else []
    text = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict))
    parsed = _parse_json_content(text)
    if parsed is None:
        return None, model, "model did not return valid JSON"
    return parsed, model, ""


def _provider_json(prompt: str) -> tuple[dict[str, Any] | None, str, list[str]]:
    attempts: list[str] = []

    deepseek_data, deepseek_error, deepseek_provider = deepseek_json(prompt)
    if deepseek_data is not None:
        return deepseek_data, deepseek_provider or "aws-deepseek", attempts
    if deepseek_error != "missing-gateway-config":
        attempts.append(f"aws-deepseek failed: {deepseek_error}")

    gemini_data, gemini_model, gemini_err = _gemini_json(prompt)
    if gemini_data is not None and gemini_model:
        return gemini_data, f"gemini:{gemini_model}", attempts
    if gemini_model is not None:
        attempts.append(f"gemini failed: {gemini_err}")

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key:
        openai_model = os.getenv("OPENAI_REVIEW_MODEL", "gpt-4o-mini")
        data, err = _chat_json(
            endpoint="https://api.openai.com/v1/chat/completions",
            api_key=openai_key,
            model=openai_model,
            prompt=prompt,
            enforce_json=True,
        )
        if data is not None:
            return data, f"openai:{openai_model}", attempts
        attempts.append(f"openai failed: {err}")

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        data, err = _chat_json(
            endpoint="https://api.groq.com/openai/v1/chat/completions",
            api_key=groq_key,
            model=groq_model,
            prompt=prompt,
            enforce_json=False,
        )
        if data is not None:
            return data, f"groq:{groq_model}", attempts
        attempts.append(f"groq failed: {err}")

    return None, "none", attempts


def _fallback_updated_content(file_path: str, source_text: str, error_text: str | None) -> tuple[str, str]:
    text = source_text or ""
    lowered_error = (error_text or "").lower()

    if file_path.endswith("package.json") and "next is not recognized" in lowered_error:
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return text, "AI unavailable and package.json could not be parsed for safe fallback edits."
        if not isinstance(payload, dict):
            return text, "AI unavailable and package.json structure is unsupported for fallback edits."

        deps = payload.get("dependencies")
        if not isinstance(deps, dict):
            deps = {}
        if "next" not in deps:
            deps["next"] = "latest"
            payload["dependencies"] = deps
            updated = json.dumps(payload, indent=2, ensure_ascii=True)
            return updated, "AI unavailable; applied safe fallback by adding next dependency to package.json."
        return text, "AI unavailable; package.json already includes next, no safe fallback change applied."

    return text, "AI unavailable; returning original content so you can apply manual fix with runtime logs."


def _build_prompt(file_path: str, code_text: str, instruction: str, error_text: str | None) -> str:
    error_block = error_text.strip() if error_text else "No runtime error log provided."
    return (
        "You are a senior production incident fixer. Return strict JSON with keys: "
        "updated_content (string), summary (string).\n"
        "Constraints: keep behavior compatible, fix errors, improve security checks, avoid placeholder code, no markdown.\n"
        f"File path: {file_path}\n"
        f"Instruction: {instruction}\n"
        f"Error log:\n{error_block}\n\n"
        "Current file content:\n"
        f"{code_text[:24000]}"
    )


async def suggest_fix_draft(
    org_id: str,
    project_id: str,
    file_path: str,
    instruction: str,
    error_text: str | None,
) -> dict[str, Any]:
    source = read_source_file(org_id, project_id, file_path)
    prompt = _build_prompt(source["file_path"], source["content"], instruction, error_text)
    payload, provider, attempts = _provider_json(prompt)
    if payload is None:
        fallback_content, fallback_summary = _fallback_updated_content(
            source["file_path"],
            source["content"],
            error_text,
        )
        detail = "No AI key configured."
        if attempts:
            attempt_text = " | ".join(attempts[:2])
            detail = f"AI providers unavailable ({attempt_text})."
        return {
            "file_path": source["file_path"],
            "language": source["language"],
            "updated_content": fallback_content,
            "summary": (
                f"{detail} {fallback_summary} "
                "Check OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY and billing/permissions."
            ),
            "provider": "fallback:local-template",
        }

    updated = str(payload.get("updated_content", "")).strip()
    summary = str(payload.get("summary", "Generated fix draft.")).strip()
    if not updated:
        raise ValueError("Model did not return updated_content")

    return {
        "file_path": source["file_path"],
        "language": source["language"],
        "updated_content": updated,
        "summary": summary or "Generated fix draft.",
        "provider": provider,
    }
