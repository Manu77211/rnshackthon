import asyncio
from services.parser import discover_files, parse_file
from services.project_store import chunks_file, read_json, source_dir, write_json


def _node_id(path: str) -> str:
    return path


def _join_parts(base: str, rel: str) -> str:
    stack = [part for part in base.split("/") if part]
    for part in rel.split("/"):
        if not part or part == ".":
            continue
        if part == "..":
            if stack:
                stack.pop()
            continue
        stack.append(part)
    return "/".join(stack)


def _candidates(dep: str, current: str) -> list[str]:
    if dep.startswith("."):
        base = current.rsplit("/", 1)[0] if "/" in current else ""
        raw = _join_parts(base, dep)
        variants = [raw]
    elif dep.startswith("@/"):
        variants = [dep[2:]]
    else:
        variants = [dep.replace(".", "/")]
    enriched: list[str] = []
    for item in variants:
        enriched.extend([
            item,
            f"{item}.ts",
            f"{item}.tsx",
            f"{item}.js",
            f"{item}.jsx",
            f"{item}.py",
            f"{item}/index.ts",
            f"{item}/index.js",
            f"{item}/__init__.py",
        ])
    return enriched


def _resolve(dep: str, current: str, known: set[str]) -> str | None:
    if dep in known:
        return dep
    for item in _candidates(dep, current):
        if item in known:
            return item
    return None


def _parse_from_source(org_id: str, project_id: str) -> list[dict]:
    root = source_dir(org_id, project_id)
    if not root.exists():
        return []
    files = discover_files(root)
    chunks: list[dict] = []
    for file_path in files:
        chunks.extend(parse_file(file_path, root))
    for index, chunk in enumerate(chunks):
        chunk["id"] = f"chunk_{index + 1}"
    return chunks


def _stats_from_chunks(chunks: list[dict]) -> dict[str, dict]:
    file_stats: dict[str, dict] = {}
    for chunk in chunks:
        file_path = chunk["file_path"]
        stat = file_stats.setdefault(
            file_path,
            {
                "functions": 0,
                "classes": 0,
                "chunks": 0,
                "function_names": [],
                "class_names": [],
                "symbol_snippets": [],
            },
        )
        stat["chunks"] += 1
        name = str(chunk.get("chunk_name", "")).strip()
        metadata = chunk.get("metadata", {})
        if chunk["chunk_type"] in {"function", "class"} and name:
            stat["symbol_snippets"].append(
                {
                    "name": name,
                    "type": chunk["chunk_type"],
                    "line_start": int(metadata.get("line_start", 0)),
                    "line_end": int(metadata.get("line_end", 0)),
                    "code_text": str(chunk.get("code_text", ""))[:2500],
                }
            )
        if chunk["chunk_type"] == "function":
            stat["functions"] += 1
            if name and name not in stat["function_names"]:
                stat["function_names"].append(name)
        if chunk["chunk_type"] == "class":
            stat["classes"] += 1
            if name and name not in stat["class_names"]:
                stat["class_names"].append(name)
    return file_stats


def _build_edges(chunks: list[dict], known: set[str]) -> list[dict]:
    edges: set[tuple[str, str]] = set()
    for chunk in chunks:
        src = chunk["file_path"]
        deps = chunk.get("metadata", {}).get("dependencies", [])
        for dep in deps:
            resolved = _resolve(dep, src, known)
            if resolved and resolved != src:
                edges.add((src, resolved))
    return [{"source": src, "target": dst} for src, dst in sorted(edges)]


def _build_nodes(file_stats: dict[str, dict]) -> list[dict]:
    return [
        {
            "id": _node_id(path),
            "label": path.split("/")[-1],
            "file_path": path,
            "chunk_count": stat["chunks"],
            "function_count": stat["functions"],
            "class_count": stat["classes"],
            "function_names": stat["function_names"][:30],
            "class_names": stat["class_names"][:30],
            "symbol_snippets": stat["symbol_snippets"][:12],
        }
        for path, stat in file_stats.items()
    ]


async def build_map(org_id: str, project_id: str) -> dict:
    chunks = await read_json(chunks_file(org_id, project_id))
    if not chunks:
        raise FileNotFoundError("Project chunks not found")
    file_stats = _stats_from_chunks(chunks)

    total_symbols = sum(v["functions"] + v["classes"] for v in file_stats.values())
    if total_symbols == 0:
        reparsed = await asyncio.to_thread(_parse_from_source, org_id, project_id)
        if reparsed:
            await write_json(chunks_file(org_id, project_id), reparsed)
            chunks = reparsed
            file_stats = _stats_from_chunks(chunks)

    nodes = _build_nodes(file_stats)
    edge_items = _build_edges(chunks, set(file_stats))
    total_fn = sum(item["function_count"] for item in nodes)
    total_cls = sum(item["class_count"] for item in nodes)
    return {
        "nodes": nodes,
        "edges": edge_items,
        "stats": {
            "totalFiles": len(nodes),
            "totalFunctions": total_fn,
            "totalClasses": total_cls,
        },
    }
