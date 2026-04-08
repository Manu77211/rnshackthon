from typing import Any

from git import Repo
from git.exc import GitCommandError

from services.project_store import source_dir


def _safe_commit_files(commit: Any) -> list[str]:
    try:
        return sorted(str(path) for path in commit.stats.files.keys())
    except GitCommandError:
        return []


def _extract_commits(repo_path: str, max_count: int = 200) -> list[dict[str, Any]]:
    repo = Repo(repo_path)
    items: list[dict[str, Any]] = []
    for commit in repo.iter_commits(max_count=max_count):
        files = _safe_commit_files(commit)
        items.append(
            {
                "hash": str(commit.hexsha)[:12],
                "author": str(commit.author.name),
                "date": commit.committed_datetime.isoformat(),
                "message": str(commit.message).strip(),
                "files": files,
            }
        )
    return items


def _overlap(left: set[str], right: list[str]) -> bool:
    return bool(left.intersection(set(right)))


def _cluster_summary(author: str, day: str, files: set[str], count: int) -> str:
    return f"{count} commits by {author} on {day} touching {len(files)} files"


def _group_commits(commits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    clusters: list[dict[str, Any]] = []
    for item in commits:
        day = str(item.get("date", ""))[:10]
        author = str(item.get("author", "unknown"))
        files = [str(value) for value in item.get("files", [])]
        placed = False
        for cluster in clusters:
            if cluster["author"] != author or cluster["day"] != day:
                continue
            if _overlap(cluster["file_set"], files) or not cluster["file_set"]:
                cluster["commits"].append(item)
                cluster["file_set"].update(files)
                placed = True
                break
        if placed:
            continue
        clusters.append(
            {
                "author": author,
                "day": day,
                "commits": [item],
                "file_set": set(files),
            }
        )

    output: list[dict[str, Any]] = []
    for index, cluster in enumerate(clusters, start=1):
        files = sorted(cluster["file_set"])
        count = len(cluster["commits"])
        output.append(
            {
                "cluster_id": f"cluster_{index}",
                "author": cluster["author"],
                "day": cluster["day"],
                "commit_count": count,
                "files": files,
                "summary": _cluster_summary(cluster["author"], cluster["day"], cluster["file_set"], count),
            }
        )
    return output


async def summarize_git_history(org_id: str, project_id: str) -> dict[str, Any]:
    repo_path = source_dir(org_id, project_id)
    if not (repo_path / ".git").exists():
        raise FileNotFoundError("No git metadata found for this project")
    commits = _extract_commits(str(repo_path))
    clusters = _group_commits(commits)
    return {
        "project_id": project_id,
        "commit_count": len(commits),
        "clusters": clusters,
    }