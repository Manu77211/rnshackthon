import ast
import re
from pathlib import Path
from typing import Any

CODE_EXTENSIONS = {
    ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".go", ".cpp",
    ".c", ".rb", ".rs", ".php", ".vue",
}
IGNORE_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__", ".next"}
JS_LIKE = {"js", "ts", "jsx", "tsx", "vue"}


def discover_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in CODE_EXTENSIONS:
            files.append(path)
    return files


def _imports_js(content: str) -> list[str]:
    found = re.findall(r"import\s+.+?from\s+[\"'](.+?)[\"']", content)
    found += re.findall(r"export\s+.+?from\s+[\"'](.+?)[\"']", content)
    found += re.findall(r"require\([\"'](.+?)[\"']\)", content)
    found += re.findall(r"import\([\"'](.+?)[\"']\)", content)
    return sorted(set(found))


def _imports_py(content: str) -> list[str]:
    found = re.findall(r"^\s*from\s+([\w\.]+)\s+import", content, re.M)
    imports = re.findall(r"^\s*import\s+(.+)$", content, re.M)
    for item in imports:
        found.extend(part.split(" as ")[0].strip() for part in item.split(","))
    return sorted(set(found))


def _imports_py_ast(tree: ast.AST) -> list[str]:
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for name in node.names:
                imports.add(name.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module)
    return sorted(imports)


def _brace_end(lines: list[str], start: int) -> int:
    depth = 0
    opened = False
    for index in range(start, len(lines)):
        line = lines[index]
        depth += line.count("{")
        if "{" in line:
            opened = True
        depth -= line.count("}")
        if opened and depth <= 0:
            return index + 1
    return min(start + 35, len(lines))


def _indent_end(lines: list[str], start: int) -> int:
    base_indent = len(lines[start]) - len(lines[start].lstrip(" "))
    for index in range(start + 1, len(lines)):
        row = lines[index]
        if not row.strip():
            continue
        indent = len(row) - len(row.lstrip(" "))
        if indent <= base_indent and not row.lstrip().startswith(("#", "@")):
            return index
    return len(lines)


def _window_chunks(lines: list[str], path: str, lang: str) -> list[dict]:
    chunks: list[dict] = []
    step = 40
    size = 50
    for start in range(0, len(lines), step):
        end = min(start + size, len(lines))
        code = "\n".join(lines[start:end]).strip()
        if not code:
            continue
        chunks.append({
            "chunk_name": f"window_{start + 1}",
            "chunk_type": "file",
            "file_path": path,
            "code_text": code,
            "metadata": {
                "line_start": start + 1,
                "line_end": end,
                "dependencies": [],
                "language": lang,
            },
        })
        if end == len(lines):
            break
    return chunks


def _make_chunk(
    lines: list[str],
    path: str,
    lang: str,
    name: str,
    kind: str,
    start: int,
    end: int,
    imports: list[str],
) -> dict:
    code = "\n".join(lines[start:end]).strip()
    return {
        "chunk_name": name,
        "chunk_type": kind,
        "file_path": path,
        "code_text": code,
        "metadata": {
            "line_start": start + 1,
            "line_end": end,
            "dependencies": imports,
            "language": lang,
        },
    }


def _call_name(node: ast.Call) -> str | None:
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return None


def _chunk_from_ast_node(
    lines: list[str],
    path: str,
    lang: str,
    imports: list[str],
    name: str,
    kind: str,
    node: ast.AST,
) -> dict | None:
    line_start = getattr(node, "lineno", None)
    line_end = getattr(node, "end_lineno", None)
    if not isinstance(line_start, int) or not isinstance(line_end, int):
        return None
    start = max(line_start - 1, 0)
    end = min(line_end, len(lines))
    code = "\n".join(lines[start:end]).strip()
    if not code:
        return None
    call_names = sorted(
        {
            value
            for value in (
                _call_name(item)
                for item in ast.walk(node)
                if isinstance(item, ast.Call)
            )
            if isinstance(value, str) and value
        }
    )
    return {
        "chunk_name": name,
        "chunk_type": kind,
        "file_path": path,
        "code_text": code,
        "metadata": {
            "line_start": start + 1,
            "line_end": end,
            "dependencies": imports,
            "language": lang,
            "function_calls": call_names,
        },
    }


class _PythonCollector(ast.NodeVisitor):
    def __init__(
        self,
        lines: list[str],
        path: str,
        lang: str,
        imports: list[str],
    ) -> None:
        self.lines = lines
        self.path = path
        self.lang = lang
        self.imports = imports
        self.class_stack: list[str] = []
        self.chunks: list[dict[str, Any]] = []

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        chunk = _chunk_from_ast_node(
            self.lines,
            self.path,
            self.lang,
            self.imports,
            node.name,
            "class",
            node,
        )
        if chunk:
            self.chunks.append(chunk)
        self.class_stack.append(node.name)
        self.generic_visit(node)
        self.class_stack.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._visit_function_like(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._visit_function_like(node)

    def _visit_function_like(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        prefix = ".".join(self.class_stack)
        chunk_name = f"{prefix}.{node.name}" if prefix else node.name
        chunk = _chunk_from_ast_node(
            self.lines,
            self.path,
            self.lang,
            self.imports,
            chunk_name,
            "function",
            node,
        )
        if chunk:
            self.chunks.append(chunk)
        self.generic_visit(node)


def _parse_python_ast(text: str, lines: list[str], path: str, lang: str) -> list[dict]:
    tree = ast.parse(text)
    imports = _imports_py_ast(tree)
    collector = _PythonCollector(lines, path, lang, imports)
    collector.visit(tree)
    return collector.chunks


def _js_symbol_chunks(lines: list[str], path: str, lang: str, imports: list[str]) -> list[dict]:
    chunks: list[dict] = []
    in_class = False
    class_depth = 0
    for index, line in enumerate(lines):
        open_count = line.count("{")
        close_count = line.count("}")
        class_match = re.search(r"^\s*class\s+([A-Za-z_][\w]*)", line)
        if class_match:
            end = _brace_end(lines, index)
            chunks.append(_make_chunk(lines, path, lang, class_match.group(1), "class", index, end, imports))
            in_class = True
            class_depth += open_count - close_count
            continue
        fn_match = re.search(
            r"^\s*(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_][\w]*)",
            line,
        )
        if fn_match:
            end = _brace_end(lines, index)
            chunks.append(_make_chunk(lines, path, lang, fn_match.group(1), "function", index, end, imports))
            continue
        arrow_match = re.search(
            r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_][\w]*)\s*(?::\s*[^=]+)?=\s*(?:async\s*)?\([^)]*\)\s*=>",
            line,
        )
        if arrow_match:
            end = _brace_end(lines, index)
            chunks.append(_make_chunk(lines, path, lang, arrow_match.group(1), "function", index, end, imports))
            continue
        if in_class:
            method_match = re.search(
                r"^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_][\w]*)\s*\([^)]*\)\s*\{",
                line,
            )
            if method_match and method_match.group(1) != "constructor":
                end = _brace_end(lines, index)
                name = f"method:{method_match.group(1)}"
                chunks.append(_make_chunk(lines, path, lang, name, "function", index, end, imports))
        class_depth += open_count - close_count
        if class_depth <= 0:
            in_class = False
            class_depth = 0
    return chunks


def _py_symbol_chunks(lines: list[str], path: str, lang: str, imports: list[str]) -> list[dict]:
    chunks: list[dict] = []
    for index, line in enumerate(lines):
        class_match = re.search(r"^\s*class\s+([A-Za-z_][\w]*)", line)
        if class_match:
            end = _indent_end(lines, index)
            chunks.append(_make_chunk(lines, path, lang, class_match.group(1), "class", index, end, imports))
            continue
        fn_match = re.search(r"^\s*def\s+([A-Za-z_][\w]*)", line)
        if fn_match:
            end = _indent_end(lines, index)
            chunks.append(_make_chunk(lines, path, lang, fn_match.group(1), "function", index, end, imports))
    return chunks


def parse_file(path: Path, root: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    relative = str(path.relative_to(root)).replace("\\", "/")
    lang = path.suffix.lower().replace(".", "") or "unknown"
    if lang == "py":
        try:
            ast_chunks = _parse_python_ast(text, lines, relative, lang)
            if ast_chunks:
                return ast_chunks
        except SyntaxError:
            pass
    imports = _imports_py(text) if lang == "py" else _imports_js(text)
    if lang in JS_LIKE:
        chunks = _js_symbol_chunks(lines, relative, lang, imports)
    elif lang == "py":
        chunks = _py_symbol_chunks(lines, relative, lang, imports)
    else:
        chunks = []
    if chunks:
        return chunks
    return _window_chunks(lines, relative, lang)
