"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { askRepository, type ChatResponse } from "@/lib/api";

type ChatPanelProps = {
  projectId: string | null;
};

export function ChatPanel({ projectId }: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ChatResponse | null>(null);

  async function submitQuestion() {
    if (!projectId) {
      setError("Ingest a project first.");
      return;
    }
    if (question.trim().length < 6) {
      setError("Write a longer question for useful context.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await askRepository({ projectId, question: question.trim() });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat query failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Chat with Repository</p>
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask: Where is auth middleware applied?"
        className="mt-3 h-32 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submitQuestion}
          disabled={loading}
          className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-900"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Ask"}
        </button>
        <p className="text-sm text-rose-700">{error}</p>
      </div>
      {result ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-800">{result.answer}</p>
          <div className="mt-3 grid gap-2">
            {result.references.map((ref) => (
              <article
                key={`${ref.file_path}-${ref.chunk_name}`}
                className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
              >
                <p className="font-semibold text-slate-800">{ref.file_path}</p>
                <p>{ref.chunk_name}</p>
                <p>similarity: {ref.similarity_score.toFixed(2)}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
