from pathlib import Path

from services.graph_builder import build_graph_from_chunks
from services.parser import parse_file


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_python_ast_parser_extracts_symbols_and_calls(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    _write(root / "utils.py", "def helper():\n    return 1\n")
    _write(
        root / "main.py",
        "\n".join(
            [
                "from utils import helper",
                "",
                "class Greeter:",
                "    def run(self):",
                "        return helper()",
                "",
                "def work():",
                "    return helper()",
            ]
        )
        + "\n",
    )

    chunks = parse_file(root / "main.py", root)
    names = {chunk["chunk_name"] for chunk in chunks}
    assert "Greeter" in names
    assert "Greeter.run" in names
    assert "work" in names

    work_chunk = next(chunk for chunk in chunks if chunk["chunk_name"] == "work")
    calls = work_chunk.get("metadata", {}).get("function_calls", [])
    assert "helper" in calls


def test_graph_builder_creates_import_and_call_edges(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    _write(root / "utils.py", "def helper():\n    return 1\n")
    _write(
        root / "main.py",
        "\n".join(
            [
                "from utils import helper",
                "",
                "def work():",
                "    return helper()",
            ]
        )
        + "\n",
    )

    chunks = [
        *parse_file(root / "utils.py", root),
        *parse_file(root / "main.py", root),
    ]
    for index, chunk in enumerate(chunks):
        chunk["id"] = f"chunk_{index + 1}"

    graph = build_graph_from_chunks("demo", chunks)
    edges = graph["edges"]

    import_edge = {
        "source": "file:main.py",
        "target": "file:utils.py",
        "type": "imports",
    }
    call_edge = {
        "source": "function:main.py::work",
        "target": "function:utils.py::helper",
        "type": "calls",
    }

    assert import_edge in edges
    assert call_edge in edges