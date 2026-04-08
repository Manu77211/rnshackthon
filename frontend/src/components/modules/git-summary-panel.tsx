"use client";

import { useState } from "react";
import { LoaderCircle, GitBranch, ShieldAlert } from "lucide-react";
import {
  analyzePullRequest,
  fetchGitSummary,
  type GitSummaryResponse,
  type PRReviewResponse,
} from "@/lib/api";

type GitSummaryPanelState = "idle" | "loading" | "success" | "error";
type PRReviewState = "idle" | "loading" | "success" | "error";

export function GitSummaryPanel({ projectId }: { projectId: string | null }) {
  const [status, setStatus] = useState<GitSummaryPanelState>("idle");
  const [data, setData] = useState<GitSummaryResponse | null>(null);
  const [error, setError] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [includeAI, setIncludeAI] = useState(true);
  const [reviewStatus, setReviewStatus] = useState<PRReviewState>("idle");
  const [review, setReview] = useState<PRReviewResponse | null>(null);
  const [reviewError, setReviewError] = useState("");

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

  const analyzePR = async () => {
    if (!projectId) {
      return;
    }
    if (!prUrl.trim()) {
      setReviewStatus("error");
      setReviewError("Paste a valid GitHub PR URL to run review.");
      return;
    }
    setReviewStatus("loading");
    setReviewError("");
    try {
      const result = await analyzePullRequest({
        projectId,
        prUrl: prUrl.trim(),
        includeAI,
        maxFindings: 20,
      });
      setReview(result);
      setReviewStatus("success");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "PR review failed.");
      setReviewStatus("error");
    }
  };

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

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">PR Security Review</p>
            <p className="mt-1 text-sm text-slate-700">
              Analyze a GitHub pull request with pattern detection, embeddings, and AI explanations.
            </p>
          </div>
          <button
            onClick={() => {
              void analyzePR();
            }}
            disabled={reviewStatus === "loading"}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          >
            <ShieldAlert className="mr-2 inline h-4 w-4" />
            Run PR Review
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={prUrl}
            onChange={(event) => setPrUrl(event.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeAI}
              onChange={(event) => setIncludeAI(event.target.checked)}
            />
            AI explanations
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Uses GitHub API diff + local embedding index. Set GITHUB_TOKEN for private repositories.
        </p>
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

      {reviewStatus === "loading" ? (
        <div className="mt-4 flex items-center gap-2 text-slate-700">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Running PR risk analysis...
        </div>
      ) : null}

      {reviewStatus === "error" ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {reviewError}
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

      {review ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">PR Overview</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">#{review.pr_number} {review.title}</h3>
            <p className="mt-1 text-sm text-slate-600">Repo: {review.repository}</p>
            <p className="text-sm text-slate-600">Provider: {review.provider} | Embeddings: {review.embedding_backend}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Total {review.summary.total}</span>
              <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Critical {review.summary.critical}</span>
              <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-700">High {review.summary.high}</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Medium {review.summary.medium}</span>
              <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">Low {review.summary.low}</span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <div className="space-y-3">
              {review.findings.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  No high-confidence security findings detected in changed lines.
                </div>
              ) : (
                review.findings.map((item) => (
                  <article key={item.finding_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {item.risk_type} ({item.severity})
                      </h4>
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                        Risk {item.risk_score}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.file_path}:{item.line_number}</p>
                    <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
{item.code_snippet}
                    </pre>
                    <p className="mt-2 text-sm text-slate-700">{item.reason}</p>
                    <p className="mt-2 text-sm text-slate-800">AI: {item.ai_explanation}</p>
                    <p className="mt-2 text-sm text-sky-800">Fix: {item.suggested_fix}</p>
                    {item.references.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                        <p className="font-medium text-slate-800">Similar code references</p>
                        {item.references.map((ref) => (
                          <p key={`${item.finding_id}-${ref.file_path}-${ref.chunk_name}`}>
                            {ref.file_path}::{ref.chunk_name} ({ref.similarity_score.toFixed(3)})
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>

            <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Impact Graph</p>
              <p className="mt-1 text-sm text-slate-700">
                {review.impact_graph.nodes.length} nodes • {review.impact_graph.edges.length} edges
              </p>
              <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
                {review.impact_graph.nodes.map((node) => (
                  <p key={node.id}>
                    {node.type}: {node.file_path || node.name}
                  </p>
                ))}
              </div>
              <div className="mt-3 max-h-52 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
                {review.impact_graph.edges.slice(0, 80).map((edge, index) => (
                  <p key={`${edge.source}-${edge.target}-${index}`}>
                    {edge.type}: {edge.source} {"->"} {edge.target}
                  </p>
                ))}
                {review.impact_graph.edges.length > 80 ? (
                  <p className="text-slate-500">+{review.impact_graph.edges.length - 80} more edges</p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}
