"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import {
  fetchExplorerFile,
  fetchExplorerTree,
  fetchSandboxFixDetail,
  fetchSandboxFixes,
  saveSandboxFix,
  type ExplorerFileItem,
  type SandboxFixDetail,
  type SandboxFixSummary,
} from "@/lib/api";

type SandboxPanelProps = {
  projectId: string | null;
};

export function SandboxPanel({ projectId }: SandboxPanelProps) {
  const [files, setFiles] = useState<ExplorerFileItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [note, setNote] = useState("LLM fix draft");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fixes, setFixes] = useState<SandboxFixSummary[]>([]);
  const [activeFix, setActiveFix] = useState<SandboxFixDetail | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return files;
    }
    return files.filter((item) => item.file_path.toLowerCase().includes(query));
  }, [files, search]);

  useEffect(() => {
    if (!projectId) {
      setFiles([]);
      setFixes([]);
      setSelectedFile("");
      return;
    }
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([fetchExplorerTree(projectId), fetchSandboxFixes(projectId)])
      .then(([tree, fixList]) => {
        if (!mounted) {
          return;
        }
        setFiles(tree.files);
        setFixes(fixList.items);
        const first = tree.files[0]?.file_path ?? "";
        setSelectedFile(first);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load explorer.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !selectedFile) {
      setOriginalCode("");
      setDraftCode("");
      return;
    }
    let mounted = true;
    fetchExplorerFile(projectId, selectedFile)
      .then((file) => {
        if (!mounted) {
          return;
        }
        setOriginalCode(file.content);
        setDraftCode(file.content);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load file content.");
        }
      });
    return () => {
      mounted = false;
    };
  }, [projectId, selectedFile]);

  async function saveFix() {
    if (!projectId || !selectedFile) {
      setError("Select a file and load a project first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const item = await saveSandboxFix({
        projectId,
        filePath: selectedFile,
        updatedContent: draftCode,
        note,
      });
      setFixes((prev) => [item, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sandbox fix.");
    } finally {
      setSaving(false);
    }
  }

  async function openFix(snapshotId: string) {
    if (!projectId) {
      return;
    }
    try {
      const detail = await fetchSandboxFixDetail(projectId, snapshotId);
      setActiveFix(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open saved fix.");
    }
  }

  if (!projectId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Ingest a project first to use Code Explorer and Sandbox fixes.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
        <span className="text-sm text-slate-700">Loading explorer...</span>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Code Explorer</p>
          <p className="text-sm text-slate-600">Browse files and save LLM fix versions.</p>
        </div>
        <button
          onClick={saveFix}
          disabled={saving || !selectedFile}
          className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-900"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Fix Snapshot
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[280px_1fr_320px]">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files"
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
          />
          <div className="mt-3 max-h-130 overflow-auto">
            {filtered.map((item) => (
              <button
                key={item.file_path}
                onClick={() => setSelectedFile(item.file_path)}
                className={[
                  "mb-1 w-full rounded-lg border p-2 text-left text-xs",
                  selectedFile === item.file_path
                    ? "border-sky-300 bg-sky-50 text-sky-900"
                    : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                <p className="truncate font-medium">{item.file_path}</p>
                <p className="text-[11px] text-slate-500">{item.language} • {item.line_count} lines</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">{selectedFile || "Select a file"}</p>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
              placeholder="Fix note"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">Original</p>
              <pre className="h-125 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">{originalCode}</pre>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">Draft Fix</p>
              <textarea
                value={draftCode}
                onChange={(event) => setDraftCode(event.target.value)}
                className="h-125 w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700"
              />
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Saved Fixes</p>
          <div className="mt-2 max-h-55 overflow-auto">
            {fixes.map((item) => (
              <button
                key={item.snapshot_id}
                onClick={() => openFix(item.snapshot_id)}
                className="mb-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-700"
              >
                <p className="truncate font-medium">{item.file_path}</p>
                <p className="truncate text-[11px] text-slate-500">{item.note}</p>
              </button>
            ))}
            {fixes.length === 0 ? <p className="text-xs text-slate-500">No snapshots yet.</p> : null}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
            <p className="text-xs font-medium text-slate-700">Diff Preview</p>
            <pre className="mt-1 max-h-70 overflow-auto text-[11px] text-slate-600">
{activeFix?.diff_preview || "Open a saved snapshot to inspect before/after diff."}
            </pre>
          </div>
        </aside>
      </div>
      <p className="mt-3 text-sm text-rose-700">{error}</p>
    </section>
  );
}
