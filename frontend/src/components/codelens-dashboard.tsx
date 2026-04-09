"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ModuleCard } from "@/components/modules/module-card";
import { IngestPanel } from "@/components/modules/ingest-panel";
import { MapPanel } from "@/components/modules/map-panel";
import { SandboxPanel } from "@/components/modules/sandbox-panel";
import { GitSummaryPanel } from "@/components/modules/git-summary-panel";
import { ChatPanel } from "./modules/chat-panel";
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
    <div className="min-h-screen bg-grid text-black">
      <Topbar activeModule={current?.title ?? "Ingestion"} />
      <div className="flex w-full">
        <Sidebar
          active={active}
          onSelect={setActive}
          hasProject={Boolean(ingestResult?.project_id)}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-400 p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/15 bg-white p-3 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.65)]">
              <div className="flex flex-wrap gap-2">
              {modules.map((module) => {
                const selected = module.key === active;
                return (
                  <button
                    key={module.key}
                    onClick={() => setActive(module.key)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm transition",
                      selected
                        ? "border-black bg-black text-white"
                        : "border-black/15 bg-white text-black/70 hover:border-black/50 hover:text-black",
                    ].join(" ")}
                  >
                    {module.title}
                  </button>
                );
              })}
              </div>
              <Link
                href="/"
                className="rounded-xl border border-black/20 bg-white px-3 py-2 text-xs font-medium text-black transition hover:border-black"
              >
                Back to Home
              </Link>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45 }}
              className="space-y-4"
            >
              <section className="rounded-2xl border border-black bg-black p-6 text-white shadow-[0_28px_60px_-35px_rgba(0,0,0,0.9)]">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Command Center</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Repository Intelligence Workspace</h2>
                <p className="mt-3 text-sm text-white/75">
                  Ingest source code, inspect architecture, review pull-request risk, run sandbox checks, and query the codebase with AI-assisted context.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/85">
                  <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1">Architecture Mapping</span>
                  <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1">Security Review</span>
                  <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1">Runtime Triage</span>
                  <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1">Codebase Q&A</span>
                </div>
              </section>
              {current ? <ModuleCard module={current} /> : null}
              {active === "ingest" ? (
                <>
                  <IngestPanel onIngestComplete={setIngestResult} />
                  <ProgressTimeline status={status} />
                </>
              ) : active === "map" ? (
                <MapPanel projectId={ingestResult?.project_id ?? null} />
              ) : active === "git" ? (
                <GitSummaryPanel projectId={ingestResult?.project_id ?? null} />
              ) : active === "sandbox" ? (
                <SandboxPanel projectId={ingestResult?.project_id ?? null} />
              ) : active === "chat" ? (
                <ChatPanel projectId={ingestResult?.project_id ?? null} />
              ) : (
                <section className="rounded-2xl border border-black/15 bg-white p-6 shadow-sm">
                  <p className="text-sm text-black/70">
                    This module is being prepared for live data integration.
                  </p>
                </section>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
