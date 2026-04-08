export type ModuleKey = "environment" | "ingest" | "map" | "diagnose" | "git" | "sandbox" | "chat";

export type ModuleMeta = {
  key: ModuleKey;
  title: string;
  phase: string;
  summary: string;
  highlights: string[];
  gradient: string;
};

export const modules: ModuleMeta[] = [
  {
    key: "environment",
    title: "Environment Scanner",
    phase: "Phase 3",
    summary: "Scan local system and dependency health before deeper repository analysis.",
    highlights: ["System versions", "Missing dependencies", "Health score"],
    gradient: "from-cyan-100/90 to-sky-100/75",
  },
  {
    key: "ingest",
    title: "Codebase Ingestion",
    phase: "Phase 2",
    summary: "Upload ZIP or GitHub URL and index files for AI processing.",
    highlights: ["ZIP + GitHub inputs", "Language detection", "Chunk pipeline"],
    gradient: "from-sky-100/90 to-blue-100/75",
  },
  {
    key: "git",
    title: "Git History Parser",
    phase: "Phase 4",
    summary: "Extract commits, cluster related changes, and summarize project history.",
    highlights: ["Commit extraction", "Change clustering", "Story summaries"],
    gradient: "from-violet-100/90 to-fuchsia-100/75",
  },
  {
    key: "map",
    title: "Dependency Map",
    phase: "Phase 4",
    summary: "Visualize files, functions, classes, and import edges.",
    highlights: ["Graph layout", "Node insights", "Search and highlight"],
    gradient: "from-emerald-100/80 to-cyan-100/80",
  },
  {
    key: "diagnose",
    title: "Semantic Diagnosis",
    phase: "Phase 5",
    summary: "Paste stack traces and rank likely culprit files.",
    highlights: ["Embedding match", "Similarity score", "Actionable reasons"],
    gradient: "from-orange-100/85 to-amber-100/80",
  },
  {
    key: "sandbox",
    title: "Code Explorer Sandbox",
    phase: "Phase 6",
    summary: "Inspect repository files and track LLM fix snapshots with diffs.",
    highlights: ["File tree", "Editable draft", "Saved fix timeline"],
    gradient: "from-rose-100/80 to-pink-100/80",
  },
  {
    key: "chat",
    title: "Chat With Codebase",
    phase: "Phase 6",
    summary: "Ask natural language questions grounded in repository context.",
    highlights: ["RAG context", "Code references", "Fast Q&A"],
    gradient: "from-indigo-100/80 to-sky-100/80",
  },
];
