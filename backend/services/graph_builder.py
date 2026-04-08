from typing import Any


Chunk = dict[str, Any]
Node = dict[str, Any]
Edge = dict[str, str]


def _file_id(file_path: str) -> str:
    return f"file:{file_path}"


def _symbol_id(file_path: str, chunk_type: str, chunk_name: str) -> str:
    return f"{chunk_type}:{file_path}::{chunk_name}"


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


def _dep_candidates(dep: str, current_file: str) -> list[str]:
    if dep.startswith("."):
        base = current_file.rsplit("/", 1)[0] if "/" in current_file else ""
        roots = [_join_parts(base, dep)]
    elif dep.startswith("@/"):
        roots = [dep[2:]]
    else:
        roots = [dep.replace(".", "/")]
    values: list[str] = []
    for root in roots:
        values.extend(
            [
                root,
                f"{root}.py",
                f"{root}.ts",
                f"{root}.tsx",
                f"{root}.js",
                f"{root}.jsx",
                f"{root}/__init__.py",
                f"{root}/index.ts",
                f"{root}/index.js",
            ]
        )
    return values


def _resolve_dep(dep: str, current_file: str, known_files: set[str]) -> str | None:
    if dep in known_files:
        return dep
    for candidate in _dep_candidates(dep, current_file):
        if candidate in known_files:
            return candidate
    return None


def _collect_nodes(chunks: list[Chunk]) -> tuple[list[Node], dict[tuple[str, str], str], dict[str, list[str]]]:
    known_files = sorted({str(item.get("file_path", "")) for item in chunks if item.get("file_path")})
    nodes: list[Node] = [
        {
            "id": _file_id(path),
            "type": "file",
            "name": path.rsplit("/", 1)[-1],
            "file_path": path,
        }
        for path in known_files
    ]

    symbol_index: dict[tuple[str, str], str] = {}
    symbols_by_name: dict[str, list[str]] = {}
    for chunk in chunks:
        chunk_type = str(chunk.get("chunk_type", ""))
        if chunk_type not in {"function", "class"}:
            continue
        file_path = str(chunk.get("file_path", ""))
        chunk_name = str(chunk.get("chunk_name", "")).strip()
        if not file_path or not chunk_name:
            continue
        node_id = _symbol_id(file_path, chunk_type, chunk_name)
        metadata = chunk.get("metadata", {})
        embedding = metadata.get("embedding") if isinstance(metadata, dict) else None
        node_payload: Node = {
            "id": node_id,
            "type": chunk_type,
            "name": chunk_name,
            "file_path": file_path,
            "line_start": int(chunk.get("metadata", {}).get("line_start", 0)),
            "line_end": int(chunk.get("metadata", {}).get("line_end", 0)),
        }
        if isinstance(embedding, list) and embedding:
            node_payload["embedding"] = embedding
        nodes.append(
            node_payload
        )
        symbol_index[(file_path, chunk_name)] = node_id
        symbols_by_name.setdefault(chunk_name.split(".")[-1], []).append(node_id)

    return nodes, symbol_index, symbols_by_name


def _import_edges(chunks: list[Chunk], known_files: set[str]) -> list[Edge]:
    edges: set[tuple[str, str, str]] = set()
    deps_by_file: dict[str, set[str]] = {}
    for chunk in chunks:
        file_path = str(chunk.get("file_path", ""))
        raw_deps = chunk.get("metadata", {}).get("dependencies", [])
        values = {str(dep) for dep in raw_deps if str(dep)}
        deps_by_file.setdefault(file_path, set()).update(values)

    for file_path, deps in deps_by_file.items():
        src = _file_id(file_path)
        for dep in deps:
            resolved = _resolve_dep(dep, file_path, known_files)
            if not resolved or resolved == file_path:
                continue
            edges.add((src, _file_id(resolved), "imports"))
    return [{"source": s, "target": t, "type": r} for s, t, r in sorted(edges)]


def _call_edges(
    chunks: list[Chunk],
    symbol_index: dict[tuple[str, str], str],
    symbols_by_name: dict[str, list[str]],
) -> list[Edge]:
    edges: set[tuple[str, str, str]] = set()
    for chunk in chunks:
        if str(chunk.get("chunk_type", "")) != "function":
            continue
        file_path = str(chunk.get("file_path", ""))
        chunk_name = str(chunk.get("chunk_name", "")).strip()
        caller_id = symbol_index.get((file_path, chunk_name))
        if not caller_id:
            continue
        calls = [str(item) for item in chunk.get("metadata", {}).get("function_calls", [])]
        for call_name in calls:
            local_target = symbol_index.get((file_path, call_name))
            if local_target and local_target != caller_id:
                edges.add((caller_id, local_target, "calls"))
                continue
            targets = symbols_by_name.get(call_name, [])
            if len(targets) == 1 and targets[0] != caller_id:
                edges.add((caller_id, targets[0], "calls"))
    return [{"source": s, "target": t, "type": r} for s, t, r in sorted(edges)]


def build_graph_from_chunks(project_id: str, chunks: list[Chunk]) -> dict[str, Any]:
    nodes, symbol_index, symbols_by_name = _collect_nodes(chunks)
    known_files = {str(node["file_path"]) for node in nodes if node["type"] == "file"}
    import_edges = _import_edges(chunks, known_files)
    call_edges = _call_edges(chunks, symbol_index, symbols_by_name)
    return {
        "project_id": project_id,
        "nodes": nodes,
        "edges": [*import_edges, *call_edges],
        "stats": {
            "files": len([node for node in nodes if node["type"] == "file"]),
            "functions": len([node for node in nodes if node["type"] == "function"]),
            "classes": len([node for node in nodes if node["type"] == "class"]),
            "import_edges": len(import_edges),
            "call_edges": len(call_edges),
        },
    }