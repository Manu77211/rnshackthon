import { modules, type ModuleKey } from "@/components/modules/module-data";
import { Bot, Bug, GitGraph, GitPullRequest, ScanSearch, UploadCloud, Wrench } from "lucide-react";

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
  return (
    <aside className="w-full border-r border-slate-200 bg-white/80 p-4 md:w-72 md:min-h-[calc(100vh-81px)]">
      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">Workflow</p>
      <p className="mb-4 text-xs text-slate-600">GitVizz-style module navigation</p>
      <nav className="grid gap-2">
        {modules.map((module) => {
          const Icon = iconMap[module.key];
          const selected = module.key === active;
          return (
            <button
              key={module.key}
              onClick={() => onSelect(module.key)}
              className={[
                "rounded-xl border px-4 py-3 text-left transition",
                selected
                  ? "border-sky-300 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {module.title}
                </p>
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{module.phase}</span>
              </div>
            </button>
          );
        })}
      </nav>
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="uppercase tracking-[0.2em] text-slate-500">Session</p>
        <p className="mt-2 font-medium text-slate-700">{hasProject ? "Repository indexed" : "Waiting for ingestion"}</p>
      </div>
    </aside>
  );
}
