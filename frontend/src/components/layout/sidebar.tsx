"use client";

import { useState } from "react";
import { modules, type ModuleKey } from "@/components/modules/module-data";
import { Bot, Bug, GitGraph, GitPullRequest, ScanSearch, UploadCloud, Wrench, ChevronRight, ChevronLeft } from "lucide-react";

type SidebarProps = {
  active: ModuleKey;
  onSelect: (key: ModuleKey) => void;
  hasProject: boolean;
};

const iconMap = {
  environment: ScanSearch,
  ingest: UploadCloud,
  map: GitGraph,
  diagnose: Bug,
  git: GitPullRequest,
  sandbox: Wrench,
  chat: Bot,
} as const;

export function Sidebar({ active, onSelect, hasProject }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`min-h-[calc(100vh-81px)] border-r border-slate-200 bg-white/90 transition-all duration-300 overflow-hidden flex flex-col ${
        expanded ? "w-64" : "w-16"
      }`}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-center p-2 border-b border-slate-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-1.5 hover:bg-slate-100 transition text-slate-600"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-1 py-2">
        <div className="grid gap-1">
          {modules.map((module) => {
            const Icon = iconMap[module.key];
            const selected = module.key === active;
            return (
              <button
                key={module.key}
                onClick={() => onSelect(module.key)}
                className={`rounded-lg p-2 transition flex items-center justify-center ${
                  expanded ? "justify-start px-3" : "justify-center"
                } ${
                  selected
                    ? "bg-sky-100 text-sky-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                title={!expanded ? module.title : ""}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {expanded && (
                  <div className="ml-3 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{module.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{module.phase}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Session Info */}
      {expanded && (
        <div className="border-t border-slate-200 p-2 m-2 rounded-lg bg-slate-50">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold px-1">Session</p>
          <p className="text-xs font-medium text-slate-700 mt-2 px-1">{hasProject ? "Repository indexed" : "Waiting..."}</p>
        </div>
      )}
    </aside>
  );
}
