"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { diagnoseError, generateInsights, type DiagnoseResponse, type InsightResponse } from "@/lib/api";

type DiagnosePanelProps = {
  projectId: string | null;
};

export function DiagnosePanel({ projectId }: DiagnosePanelProps) {
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runDiagnosis() {
    if (!projectId) {
      setMessage("Ingest a project first.");
      return;
    }
    if (errorText.trim().length < 8) {
      setMessage("Paste a longer error trace.");
      return;
    }
    setLoading(true);
    setMessage("");
    setInsights(null);
    try {
      const data = await diagnoseError(projectId, errorText);
      setResult(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Diagnosis failed");
    } finally {
      setLoading(false);
    }
  }

  async function runInsights() {
    if (!projectId) {
      setMessage("Ingest a project first.");
      return;
    }
    if (errorText.trim().length < 8) {
      setMessage("Paste a longer error trace.");
      return;
    }
    setInsightsLoading(true);
    setMessage("");
    try {
      const data = await generateInsights({ projectId, errorText, topK: 3 });
      setInsights(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Insights failed");
    } finally {
      setInsightsLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Semantic Diagnosis</p>
      <textarea
        className="mt-3 h-36 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
        placeholder="Paste stack trace or production error..."
        value={errorText}
        onChange={(event) => setErrorText(event.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={runDiagnosis}
          disabled={loading}
          className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm text-orange-900"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Diagnose Error"}
        </button>
        <button
          onClick={runInsights}
          disabled={insightsLoading}
          className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm text-violet-900"
        >
          {insightsLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Generate AI Insights"}
        </button>
        <p className="text-sm text-rose-700">{message}</p>
      </div>

      {insights ? (
        <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-700">Phase 8 AI Insights</p>
          <p className="mt-2 text-sm text-slate-800">{insights.summary}</p>
          <p className="mt-2 text-sm font-medium text-slate-900">Root cause: {insights.probable_root_cause}</p>
          <ul className="mt-3 grid gap-1 text-sm text-slate-700">
            {insights.action_items.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Provider: {insights.provider}</p>
        </section>
      ) : null}

      <div className="mt-4 grid gap-2">
        {result?.results.map((item) => (
          <article key={`${item.file_path}-${item.chunk_name}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{item.file_path}</span>
              <span>score {item.similarity_score.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-900">{item.chunk_name} ({item.chunk_type})</p>
            <pre className="mt-2 max-h-36 overflow-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
{item.code_text}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
