"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { EnvironmentPanel } from "@/components/modules/environment-panel";
import { ModuleCard } from "@/components/modules/module-card";
import { IngestPanel } from "@/components/modules/ingest-panel";
import { DiagnosePanel } from "@/components/modules/diagnose-panel";
import { MapPanel } from "@/components/modules/map-panel";
import { SandboxPanel } from "@/components/modules/sandbox-panel";import { GitSummaryPanel } from "@/components/modules/git-summary-panel";import { ChatPanel } from "./modules/chat-panel";
import { ProgressTimeline } from "@/components/modules/progress-timeline";
import { modules, type ModuleKey } from "@/components/modules/module-data";
import { type IngestResponse } from "@/lib/api";
import { useSSE } from "@/hooks/use-sse";

const firstKey = modules[0]?.key ?? "ingest";

export function CodeLensDashboard() {
  const [active, setActive] = useState<ModuleKey>(firstKey);
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const status = useSSE(ingestResult?.project_id ?? null);

  const current = useMemo(() => {
    return modules.find((module) => module.key === active) ?? modules[0];
  }, [active]);

  return (
    <div className="min-h-screen bg-grid text-slate-900">
      <Topbar
        currentPhase={current ? `${current.phase} - ${current.title}` : "Phase 3 - Environment Scanner"}
        projectId={ingestResult?.project_id ?? null}
        activeModule={current?.title ?? "Ingestion"}
      />
      <div className="mx-auto flex w-full max-w-350 flex-col md:flex-row">
        <Sidebar
          active={active}
          onSelect={setActive}
          hasProject={Boolean(ingestResult?.project_id)}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {modules.map((module) => {
              const selected = module.key === active;
              return (
                <button
                  key={module.key}
                  onClick={() => setActive(module.key)}
                  className={[
                    "rounded-lg px-3 py-2 text-sm transition",
                    selected
                      ? "bg-sky-100 text-sky-900"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {module.title}
                </button>
              );
            })}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="space-y-4"
          >
            {current ? <ModuleCard module={current} /> : null}
            {active === "environment" ? (
              <EnvironmentPanel />
            ) : active === "ingest" ? (
              <>
                <IngestPanel onIngestComplete={setIngestResult} />
                <ProgressTimeline status={status} />
              </>
            ) : active === "map" ? (
              <MapPanel projectId={ingestResult?.project_id ?? null} />
            ) : active === "diagnose" ? (
              <DiagnosePanel projectId={ingestResult?.project_id ?? null} />
            ) : active === "git" ? (
              <GitSummaryPanel projectId={ingestResult?.project_id ?? null} />
            ) : active === "sandbox" ? (
              <SandboxPanel projectId={ingestResult?.project_id ?? null} />
            ) : active === "chat" ? (
              <ChatPanel projectId={ingestResult?.project_id ?? null} />
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-700">
                  This module UI is staged for its phase. We will wire live data after
                  phase-by-phase testing.
                </p>
              </section>
            )}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Build Status
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                {ingestResult
                  ? `Ingestion started for ${ingestResult.project_id}`
                  : "Frontend Phase 3 streaming UI ready"}
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                {ingestResult
                  ? `${ingestResult.file_count} files queued. Current status: ${status?.status ?? ingestResult.status}.`
                  : "Submit an ingest request to watch queued/parsing/embedding/storing states."}
              </p>
            </section>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
