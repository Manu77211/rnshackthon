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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Code Explorer</p>
          <p className="text-sm text-slate-600 mt-1">Browse, compare, and save code improvements.</p>
        </div>
        <button
          onClick={saveFix}
          disabled={saving || !selectedFile}
          className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-900 hover:bg-sky-100 transition disabled:opacity-50"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin inline mr-2" /> : <Save className="h-4 w-4 inline mr-2" />}
          Save Fix
        </button>
      </div>

      <div className="p-6 grid gap-4 grid-cols-1 lg:grid-cols-[240px_1fr]">
        {/* File Explorer */}
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 h-fit lg:sticky lg:top-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files"
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs mb-3"
          />
          <div className="max-h-96 overflow-auto space-y-2">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <button
                  key={item.file_path}
                  onClick={() => setSelectedFile(item.file_path)}
                  className={`w-full rounded-lg border p-2 text-left text-xs transition ${
                    selectedFile === item.file_path
                      ? "border-sky-300 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="truncate font-medium">{item.file_path.split("/").pop()}</p>
                  <p className="text-[11px] text-slate-500">{item.language} • {item.line_count} lines</p>
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-2">No files found</p>
            )}
          </div>
        </aside>

        {/* Code Editor & Diff Section */}
        <div className="space-y-4">
          {selectedFile && (
            <div className="flex flex-col gap-4">
              {/* File Header & Note */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedFile}</p>
                    <p className="text-xs text-slate-500 mt-1">Edit your fix below, then save as snapshot</p>
                  </div>
                </div>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  placeholder="e.g., 'Fixed buffer overflow in input validation'"
                />
              </div>

              {/* Original + Draft in 2 columns */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-600 font-semibold">Original Code</p>
                  </div>
                  <pre className="h-96 overflow-auto p-4 text-xs text-slate-700 font-mono whitespace-pre-wrap break-words">
                    {originalCode || "No code loaded"}
                  </pre>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="bg-sky-50 border-b border-sky-200 px-4 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-sky-700 font-semibold">Your Draft Fix</p>
                  </div>
                  <textarea
                    value={draftCode}
                    onChange={(event) => setDraftCode(event.target.value)}
                    className="h-96 w-full p-4 text-xs text-slate-700 font-mono resize-none focus:outline-none border-none"
                    placeholder="Edit original code here..."
                  />
                </div>
              </div>
            </div>
          )}

          {!selectedFile && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-600">Select a file from the list to start editing</p>
            </div>
          )}
        </div>
      </div>

      {/* Saved Snapshots & Diff Preview */}
      <div className="border-t border-slate-200 p-6">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3">Saved Snapshots</p>
            <div className="max-h-80 overflow-auto space-y-2">
              {fixes.length > 0 ? (
                fixes.map((item) => (
                  <button
                    key={item.snapshot_id}
                    onClick={() => openFix(item.snapshot_id)}
                    className={`w-full rounded-lg border p-2 text-left text-xs transition ${
                      activeFix?.snapshot_id === item.snapshot_id
                        ? "border-sky-300 bg-sky-50 text-sky-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="truncate font-medium">{item.file_path.split("/").pop()}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.note}</p>
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-500 p-2">No snapshots yet</p>
              )}
            </div>
          </aside>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-600 font-semibold">Diff Preview</p>
              {activeFix && <p className="text-xs text-slate-600 mt-1">{activeFix.file_path}</p>}
            </div>
            <pre className="h-80 overflow-auto p-4 text-xs text-slate-600 font-mono whitespace-pre-wrap break-words">
              {activeFix?.diff_preview || "Select a snapshot to view the diff"}
            </pre>
          </div>
        </div>
      </div>

      {error && <div className="border-t border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">{error}</div>}
    </section>
  );
}
