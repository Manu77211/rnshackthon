export type ModuleKey = "ingest" | "git" | "map" | "sandbox" | "chat";

export type ModuleMeta = {
  key: ModuleKey;
  title: string;
  summary: string;
  highlights: string[];
  gradient: string;
};

export const modules: ModuleMeta[] = [
  {
    key: "ingest",
    title: "Codebase Ingestion",
    summary: "Upload ZIP or GitHub URL and index files for AI processing.",
    highlights: ["ZIP + GitHub inputs", "Language detection", "Chunk pipeline"],
    gradient: "from-zinc-100/80 via-white to-zinc-200/85",
  },
  {
    key: "git",
    title: "Git History Parser",
    summary: "Extract commits, cluster related changes, and summarize project history.",
    highlights: ["Commit extraction", "Change clustering", "Story summaries"],
    gradient: "from-neutral-100/80 via-white to-zinc-200/85",
  },
  {
    key: "map",
    title: "Dependency Map",
    summary: "Visualize files, functions, classes, and import edges.",
    highlights: ["Graph layout", "Node insights", "Search and highlight"],
    gradient: "from-zinc-100/80 via-stone-50 to-neutral-200/85",
  },
  {
    key: "sandbox",
    title: "Code Explorer Sandbox",
    summary: "Inspect repository files, run checks, and generate grounded AI fix drafts.",
    highlights: ["Runtime check", "Editable draft", "AI-assisted fixes"],
    gradient: "from-stone-100/80 via-white to-zinc-200/85",
  },
  {
    key: "chat",
    title: "Chat With Codebase",
    summary: "Ask natural language questions grounded in repository context.",
    highlights: ["RAG context", "Code references", "Fast Q&A"],
    gradient: "from-neutral-100/80 via-white to-zinc-200/85",
  },
];
