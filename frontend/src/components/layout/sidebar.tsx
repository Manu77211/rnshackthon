"use client";

import { useState } from "react";
import { modules, type ModuleKey } from "@/components/modules/module-data";
import { Bot, GitGraph, GitPullRequest, UploadCloud, Wrench, ChevronRight, ChevronLeft } from "lucide-react";

type SidebarProps = {
  active: ModuleKey;
  onSelect: (key: ModuleKey) => void;
  hasProject: boolean;
};

const iconMap = {
  ingest: UploadCloud,
  map: GitGraph,
  git: GitPullRequest,
  sandbox: Wrench,
  chat: Bot,
} as const;

export function Sidebar({ active, onSelect, hasProject }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`min-h-[calc(100vh-81px)] border-r border-black bg-black text-white transition-all duration-300 overflow-hidden flex flex-col ${
        expanded ? "w-64" : "w-16"
      }`}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-center border-b border-white/20 p-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
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
                    ? "bg-white text-black"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                title={!expanded ? module.title : ""}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {expanded && (
                  <div className="ml-3 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{module.title}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Session Info */}
      {expanded && (
        <div className="m-2 rounded-lg border border-white/20 bg-white/5 p-2">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Session</p>
          <p className="mt-2 px-1 text-xs font-medium text-white/80">{hasProject ? "Repository indexed" : "Waiting for repository"}</p>
        </div>
      )}
    </aside>
  );
}
