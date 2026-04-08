import json
import os
import re
from typing import Any
from urllib import error, request

from services.embedding_service import rank_chunks
from services.project_store import chunks_file, project_file, read_json

GITHUB_API_BASE = "https://api.github.com"

PATTERNS: list[dict[str, Any]] = [
    {
        "risk_type": "sql_injection",
        "severity": "critical",
        "regex": re.compile(r"(select|insert|update|delete).*(\$\{|\+|format\(|f\"|f')", re.IGNORECASE),
        "reason": "Dynamic SQL appears to be composed with string interpolation.",
        "suggested_fix": "Use parameterized SQL placeholders and pass values separately.",
    },
    {
        "risk_type": "xss",
        "severity": "high",
        "regex": re.compile(r"(innerHTML|dangerouslySetInnerHTML|document\.write\()", re.IGNORECASE),
        "reason": "Potential HTML/script injection sink detected.",
        "suggested_fix": "Sanitize untrusted content and prefer safe DOM/text rendering methods.",
    },
    {
        "risk_type": "command_injection",
        "severity": "critical",
        "regex": re.compile(r"(os\.system\(|subprocess\.(run|Popen).*shell\s*=\s*True)", re.IGNORECASE),
        "reason": "Shell command execution with dynamic input can enable command injection.",
        "suggested_fix": "Avoid shell=True and pass validated arguments as a list.",
    },
    {
        "risk_type": "path_traversal",
        "severity": "high",
        "regex": re.compile(r"(\.\./|open\(.*\+|Path\(.*\+)", re.IGNORECASE),
        "reason": "File path appears to be built from untrusted or relative traversal input.",
        "suggested_fix": "Normalize and constrain paths to an allowlisted root before access.",
    },
    {
        "risk_type": "hardcoded_secret",
        "severity": "medium",
        "regex": re.compile(r"(api[_-]?key|secret|password|token)\s*=\s*['\"][^'\"]{6,}", re.IGNORECASE),
        "reason": "Hardcoded credential-like value detected in code changes.",
        "suggested_fix": "Move secrets to environment variables or secret manager storage.",
    },
]


def _github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "CodeLens-AI-PR-Review",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _http_get_json(url: str) -> Any:
    req = request.Request(url, headers=_github_headers(), method="GET")
    try:
        with request.urlopen(req, timeout=20) as response:
            payload = response.read().decode("utf-8")
    except error.HTTPError as exc:
        if exc.code == 404:
            raise ValueError("PR not found or not accessible") from exc
        if exc.code in {401, 403}:
            raise ValueError("GitHub API denied access. Check GITHUB_TOKEN permissions.") from exc
        raise ValueError("Failed to call GitHub API") from exc
    except error.URLError as exc:
        raise ValueError("Unable to reach GitHub API") from exc
    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid response received from GitHub API") from exc


def _parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    match = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", pr_url.strip())
    if not match:
        raise ValueError("Invalid PR URL. Expected format: https://github.com/<owner>/<repo>/pull/<number>")
    owner = match.group(1)
    repo = match.group(2).replace(".git", "")
    number = int(match.group(3))
    return owner, repo, number


def _fetch_pr_meta(owner: str, repo: str, pr_number: int) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
    payload = _http_get_json(url)
    if not isinstance(payload, dict):
        raise ValueError("Unexpected PR metadata response")
    return payload


def _fetch_pr_files(owner: str, repo: str, pr_number: int) -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    page = 1
    while True:
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/files?per_page=100&page={page}"
        payload = _http_get_json(url)
        if not isinstance(payload, list):
            raise ValueError("Unexpected PR files response")
        if not payload:
            break
        files.extend(item for item in payload if isinstance(item, dict))
        if len(payload) < 100:
            break
        page += 1
    return files


def _severity_base(severity: str) -> float:
    scores = {"critical": 0.9, "high": 0.72, "medium": 0.5, "low": 0.3}
    return scores.get(severity, 0.4)


def _exposure_score(file_path: str, snippet: str) -> float:
    value = f"{file_path} {snippet}".lower()
    if any(item in value for item in ["route", "controller", "api", "auth", "middleware"]):
        return 1.0
    if any(item in value for item in ["service", "handler", "view"]):
        return 0.6
    return 0.3


def _risk_score(severity: str, semantic_score: float, exposure: float) -> float:
    total = _severity_base(severity) * 68 + semantic_score * 22 + exposure * 10
    return round(min(100.0, max(1.0, total)), 1)


def _compact_line(line: str, max_len: int = 220) -> str:
    text = line.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _scan_added_line(file_path: str, line_number: int, line_text: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    compact = _compact_line(line_text)
    if not compact:
        return findings
    for pattern in PATTERNS:
        regex = pattern["regex"]
        if not regex.search(compact):
            continue
        findings.append(
            {
                "risk_type": pattern["risk_type"],
                "severity": pattern["severity"],
                "file_path": file_path,
                "line_number": line_number,
                "code_snippet": compact,
                "reason": pattern["reason"],
                "suggested_fix": pattern["suggested_fix"],
            }
        )
    return findings


def _scan_patch(file_path: str, patch: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    new_line = 0
    for raw in patch.splitlines():
        if raw.startswith("@@"):
            match = re.search(r"\+(\d+)(?:,(\d+))?", raw)
            if match:
                new_line = int(match.group(1))
            continue
        if raw.startswith("+++") or raw.startswith("---"):
            continue
        if raw.startswith("+"):
            findings.extend(_scan_added_line(file_path, new_line, raw[1:]))
            new_line += 1
            continue
        if raw.startswith(" "):
            new_line += 1
            continue
        if raw.startswith("-"):
            continue
    return findings


def _fallback_ai(finding: dict[str, Any]) -> tuple[str, str]:
    explanation = (
        f"Detected {finding['risk_type']} pattern in changed code. "
        f"Risk is elevated because this appears in {finding['file_path']} near line {finding['line_number']}."
    )
    return explanation, str(finding.get("suggested_fix", "Review and sanitize this code path."))


def _openai_review(prompt: str) -> dict[str, Any] | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    payload = {
        "model": os.getenv("OPENAI_REVIEW_MODEL", "gpt-4o-mini"),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


def _ai_prompt(finding: dict[str, Any], refs: list[dict[str, Any]]) -> str:
    ref_text = "\n".join(
        f"- {item['file_path']}::{item['chunk_name']} ({item['similarity_score']})"
        for item in refs[:3]
    )
    return (
        "You are a senior secure code reviewer. Return strict JSON with keys: explanation, fix. "
        "Keep each value concise (max 2 sentences).\n"
        f"Risk type: {finding['risk_type']}\n"
        f"Severity: {finding['severity']}\n"
        f"File: {finding['file_path']}:{finding['line_number']}\n"
        f"Snippet: {finding['code_snippet']}\n"
        f"Reason: {finding['reason']}\n"
        f"Similar references:\n{ref_text}\n"
    )


def _impact_graph(payload: dict[str, Any], changed_files: set[str]) -> dict[str, list[dict[str, Any]]]:
    nodes = payload.get("nodes", []) if isinstance(payload, dict) else []
    edges = payload.get("edges", []) if isinstance(payload, dict) else []
    node_map = {
        str(node.get("id", "")): node
        for node in nodes
        if isinstance(node, dict) and isinstance(node.get("id"), str)
    }

    selected = {f"file:{path}" for path in changed_files}
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        src = str(edge.get("source", ""))
        dst = str(edge.get("target", ""))
        if src in selected or dst in selected:
            selected.add(src)
            selected.add(dst)

    impact_nodes = []
    for node_id in selected:
        node = node_map.get(node_id)
        if not node:
            continue
        impact_nodes.append(
            {
                "id": node_id,
                "type": str(node.get("type", "unknown")),
                "name": str(node.get("name", node_id)),
                "file_path": str(node.get("file_path", "")),
            }
        )

    impact_edges = []
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        src = str(edge.get("source", ""))
        dst = str(edge.get("target", ""))
        if src in selected and dst in selected:
            impact_edges.append(
                {
                    "source": src,
                    "target": dst,
                    "type": str(edge.get("type", "related")),
                }
            )
    return {"nodes": impact_nodes, "edges": impact_edges}


def _summary(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"total": len(findings), "critical": 0, "high": 0, "medium": 0, "low": 0}
    for item in findings:
        severity = str(item.get("severity", "low"))
        if severity in counts:
            counts[severity] += 1
    return counts


async def analyze_pull_request(
    org_id: str,
    project_id: str,
    pr_url: str,
    include_ai: bool,
    max_findings: int,
) -> dict[str, Any]:
    owner, repo, pr_number = _parse_pr_url(pr_url)
    pr_meta = _fetch_pr_meta(owner, repo, pr_number)
    pr_files = _fetch_pr_files(owner, repo, pr_number)

    chunk_payload = await read_json(chunks_file(org_id, project_id))
    if not isinstance(chunk_payload, list):
        raise FileNotFoundError("Project chunks not found")
    graph_payload = await read_json(project_file(org_id, project_id))
    if not isinstance(graph_payload, dict):
        raise FileNotFoundError("Project graph not found")

    findings: list[dict[str, Any]] = []
    changed_files: list[str] = []
    embedding_backend = "none"

    for file_item in pr_files:
        file_path = str(file_item.get("filename", ""))
        if not file_path:
            continue
        changed_files.append(file_path)
        patch = str(file_item.get("patch", ""))
        if not patch:
            continue
        findings.extend(_scan_patch(file_path, patch))

    if not findings:
        impact_graph = _impact_graph(graph_payload, set(changed_files))
        return {
            "provider": "rules+embeddings",
            "embedding_backend": embedding_backend,
            "pr_number": pr_number,
            "repository": f"{owner}/{repo}",
            "title": str(pr_meta.get("title", "")),
            "changed_files": sorted(set(changed_files)),
            "findings": [],
            "summary": _summary([]),
            "impact_graph": impact_graph,
        }

    enriched: list[dict[str, Any]] = []
    for index, finding in enumerate(findings[:max_findings], start=1):
        query_text = (
            f"{finding['risk_type']} {finding['severity']} "
            f"{finding['file_path']} {finding['code_snippet']}"
        )
        backend, refs = await rank_chunks(
            chunk_payload,
            query_text,
            limit=3,
            allowed_types={"function", "class", "file"},
            path_hints={finding["file_path"]},
        )
        embedding_backend = backend
        semantic = float(refs[0].get("similarity_score", 0.0)) if refs else 0.0
        exposure = _exposure_score(finding["file_path"], finding["code_snippet"])
        score = _risk_score(finding["severity"], semantic, exposure)

        fallback_explanation, fallback_fix = _fallback_ai(finding)
        explanation = fallback_explanation
        suggested_fix = fallback_fix

        if include_ai:
            ai_data = _openai_review(_ai_prompt(finding, refs))
            if ai_data:
                explanation = str(ai_data.get("explanation", fallback_explanation))
                suggested_fix = str(ai_data.get("fix", fallback_fix))

        enriched.append(
            {
                "finding_id": f"risk_{index}",
                "risk_type": finding["risk_type"],
                "severity": finding["severity"],
                "risk_score": score,
                "file_path": finding["file_path"],
                "line_number": finding["line_number"],
                "code_snippet": finding["code_snippet"],
                "reason": finding["reason"],
                "ai_explanation": explanation,
                "suggested_fix": suggested_fix,
                "references": [
                    {
                        "file_path": str(item.get("file_path", "")),
                        "chunk_name": str(item.get("chunk_name", "")),
                        "similarity_score": float(item.get("similarity_score", 0.0)),
                    }
                    for item in refs
                ],
            }
        )

    enriched.sort(key=lambda item: item["risk_score"], reverse=True)
    impact_graph = _impact_graph(graph_payload, set(changed_files))

    return {
        "provider": "openai+rules+embeddings" if include_ai else "rules+embeddings",
        "embedding_backend": embedding_backend,
        "pr_number": pr_number,
        "repository": f"{owner}/{repo}",
        "title": str(pr_meta.get("title", "")),
        "changed_files": sorted(set(changed_files)),
        "findings": enriched,
        "summary": _summary(enriched),
        "impact_graph": impact_graph,
    }
