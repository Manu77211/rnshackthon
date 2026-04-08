"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, GitBranch } from "lucide-react";
import { fetchGitSummary, type GitSummaryResponse } from "@/lib/api";

type GitSummaryPanelState = "idle" | "loading" | "success" | "error";

export function GitSummaryPanel({ projectId }: { projectId: string | null }) {
  const [status, setStatus] = useState<GitSummaryPanelState>("idle");
  const [data, setData] = useState<GitSummaryResponse | null>(null);
  const [error, setError] = useState("");

  const loadSummary = async () => {
    if (!projectId) {
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const result = await fetchGitSummary(projectId);
      setData(result);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Git summary.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!projectId) {
      setData(null);
      setStatus("idle");
      setError("");
      return;
    }

    void loadSummary();
  }, [projectId]);

  if (!projectId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Ingest a Git repository first to read its commit history.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Git History Parser</p>
          <p className="mt-1 text-sm text-slate-700">Clusters related commits by author, day, and touched files.</p>
        </div>
        <button
          onClick={() => {
            void loadSummary();
          }}
          disabled={status === "loading"}
          className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700"
        >
          <GitBranch className="mr-2 inline h-4 w-4" /> Refresh
        </button>
      </div>

      {status === "loading" ? (
        <div className="mt-6 flex items-center gap-2 text-slate-700">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading commits...
        </div>
      ) : status === "error" ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Commits</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{data.commit_count}</p>
          </div>
          <div className="grid gap-4">
            {data.clusters.map((cluster) => (
              <article key={cluster.cluster_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{cluster.summary}</h3>
                  <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {cluster.commit_count} commits
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Author: {cluster.author}</p>
                <p className="text-xs text-slate-500">Date: {cluster.day}</p>
                <div className="mt-3 grid gap-1 text-xs text-slate-700">
                  {cluster.files.slice(0, 8).map((file) => (
                    <span key={file} className="rounded-full bg-slate-100 px-2 py-1">{file}</span>
                  ))}
                  {cluster.files.length > 8 ? (
                    <span className="text-slate-500">+{cluster.files.length - 8} more files</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
