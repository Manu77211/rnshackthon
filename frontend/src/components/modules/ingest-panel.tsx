"use client";

import { useMemo, useState } from "react";
import { Upload, GitBranch, LoaderCircle } from "lucide-react";
import { ingestGithub, ingestZip, type IngestMode, type IngestResponse } from "@/lib/api";

type IngestPanelProps = {
  onIngestComplete: (result: IngestResponse) => void;
};

type IngestStatus = "idle" | "loading" | "success" | "error";

export function IngestPanel({ onIngestComplete }: IngestPanelProps) {
  const [mode, setMode] = useState<IngestMode>("zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [status, setStatus] = useState<IngestStatus>("idle");
  const [message, setMessage] = useState("Waiting for input.");

  const canSubmit = useMemo(() => {
    if (mode === "zip") {
      return zipFile !== null;
    }
    return repoUrl.trim().startsWith("http");
  }, [mode, zipFile, repoUrl]);

  async function handleSubmit() {
    if (!canSubmit) {
      setStatus("error");
      setMessage("Add valid input before submitting.");
      return;
    }

    setStatus("loading");
    setMessage("Sending ingestion request...");

    try {
      const result =
        mode === "zip" && zipFile
          ? await ingestZip(zipFile)
          : await ingestGithub({ repoUrl: repoUrl.trim(), branch: branch.trim() || "main" });

      setStatus("success");
      setMessage(
        `Ingestion started. Project ${result.project_id} with ${result.file_count} files is ${result.status}.`
      );
      onIngestComplete(result);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to start ingestion.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`rounded-lg border px-3 py-2 text-sm ${mode === "zip" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 text-slate-700"}`}
          onClick={() => setMode("zip")}
        >
          <Upload className="mr-2 inline h-4 w-4" /> ZIP Upload
        </button>
        <button
          className={`rounded-lg border px-3 py-2 text-sm ${mode === "github" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 text-slate-700"}`}
          onClick={() => setMode("github")}
        >
          <GitBranch className="mr-2 inline h-4 w-4" /> GitHub URL
        </button>
      </div>

      {mode === "zip" ? (
        <div className="mt-4">
          <label className="block text-sm text-slate-700">Select .zip repository</label>
          <input
            type="file"
            accept=".zip"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-700"
            onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700 md:col-span-2">
            GitHub repo URL
            <input
              type="url"
              placeholder="https://github.com/owner/repo"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            Branch
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || status === "loading"}
          className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? (
            <span>
              <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Starting...
            </span>
          ) : (
            "Start Ingestion"
          )}
        </button>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </section>
  );
}
