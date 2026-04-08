type TopbarProps = {
  currentPhase: string;
  projectId: string | null;
  activeModule: string;
};

export function Topbar({ currentPhase, projectId, activeModule }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Analysis Workspace</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">CodeLens AI Dashboard</h1>
          <p className="mt-1 text-xs text-slate-600">Module: {activeModule}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">
            {currentPhase}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
            {projectId ? `Project ${projectId}` : "No project loaded"}
          </span>
        </div>
      </div>
    </header>
  );
}
