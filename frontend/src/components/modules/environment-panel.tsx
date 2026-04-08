"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { fetchEnvironmentScan, type EnvironmentScanResponse } from "@/lib/api";

type ScanState = "idle" | "loading" | "success" | "error";

function badgeClass(score: number): string {
  if (score >= 90) {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  if (score >= 70) {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }
  return "border-rose-300 bg-rose-50 text-rose-800";
}

export function EnvironmentPanel() {
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [data, setData] = useState<EnvironmentScanResponse | null>(null);

  const summary = useMemo(() => {
    if (!data) {
      return "Run scan to generate local environment health report.";
    }
    return `${data.issues_count} issues found. Health score ${data.health_score}/100.`;
  }, [data]);

  async function runScan(): Promise<void> {
    setState("loading");
    setError("");
    try {
      const result = await fetchEnvironmentScan();
      setData(result);
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to scan environment.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Environment Scanner</p>
          <p className="mt-1 text-sm text-slate-700">{summary}</p>
        </div>
        <button
          onClick={runScan}
          disabled={state === "loading"}
          className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-900"
        >
          {state === "loading" ? (
            <span>
              <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Scanning...
            </span>
          ) : (
            <span>
              <RefreshCcw className="mr-2 inline h-4 w-4" /> Scan Environment
            </span>
          )}
        </button>
      </div>

      {data ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Health Score</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{data.health_score}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${Math.max(0, Math.min(100, data.health_score))}%` }}
                />
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Issues</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{data.issues_count}</p>
              <span className={`mt-2 inline-block rounded-full border px-2 py-1 text-xs ${badgeClass(data.health_score)}`}>
                {data.health_score >= 90 ? "Healthy" : data.health_score >= 70 ? "Needs attention" : "Critical gaps"}
              </span>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">System</p>
              <p className="mt-2">OS: {data.system.os}</p>
              <p>Python: {data.system.python_version}</p>
              <p>Node: {data.system.node_version}</p>
              <p>Git: {data.system.git_version}</p>
              <p>RAM: {data.system.ram_gb ?? "unknown"} GB</p>
              <p>
                Disk: {data.system.disk_free_gb} GB free / {data.system.disk_total_gb} GB
              </p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Python Packages</p>
              <ul className="mt-2 space-y-1">
                {data.dependencies.missing_python.map((item) => (
                  <li key={item} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                    {item}
                  </li>
                ))}
                {data.dependencies.missing_python.length === 0 ? (
                  <li className="text-emerald-700">No missing Python packages.</li>
                ) : null}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Node Packages</p>
              <ul className="mt-2 space-y-1">
                {data.dependencies.missing_node.map((item) => (
                  <li key={item} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                    {item}
                  </li>
                ))}
                {data.dependencies.missing_node.length === 0 ? (
                  <li className="text-emerald-700">No missing Node packages.</li>
                ) : null}
              </ul>
            </article>
          </div>
        </>
      ) : null}

      {state === "error" ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}