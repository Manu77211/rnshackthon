export type IngestMode = "zip" | "github";

export type IngestResponse = {
  project_id: string;
  file_count: number;
  status: string;
};

export type ProjectStatus = {
  project_id: string;
  status: string;
  progress: number;
};

export type EnvironmentScanResponse = {
  health_score: number;
  issues_count: number;
  system: {
    os: string;
    python_version: string;
    node_version: string;
    git_version: string;
    ram_gb: number | null;
    disk_total_gb: number;
    disk_free_gb: number;
  };
  dependencies: {
    missing_python: string[];
    missing_node: string[];
  };
};

export type MapNode = {
  id: string;
  label: string;
  file_path: string;
  chunk_count: number;
  function_count: number;
  class_count: number;
  function_names: string[];
  class_names: string[];
  symbol_snippets: Array<{
    name: string;
    type: string;
    line_start: number;
    line_end: number;
    code_text: string;
  }>;
};

export type MapEdge = {
  source: string;
  target: string;
};

export type MapResponse = {
  nodes: MapNode[];
  edges: MapEdge[];
  stats: {
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
  };
};

export type DiagnoseItem = {
  file_path: string;
  chunk_name: string;
  chunk_type: string;
  code_text: string;
  similarity_score: number;
  reason: string;
};

export type DiagnoseResponse = {
  results: DiagnoseItem[];
};

export type ChatRequest = {
  projectId: string;
  question: string;
};

export type ChatResponse = {
  answer: string;
  references: Array<{
    file_path: string;
    chunk_name: string;
    similarity_score: number;
  }>;
};

export type ExplorerFileItem = {
  file_path: string;
  language: string;
  line_count: number;
};

export type ExplorerTreeResponse = {
  files: ExplorerFileItem[];
};

export type ExplorerFileResponse = {
  file_path: string;
  language: string;
  content: string;
};

export type SandboxFixSummary = {
  snapshot_id: string;
  file_path: string;
  created_at: string;
  note: string;
};

export type SandboxFixListResponse = {
  items: SandboxFixSummary[];
};

export type SandboxFixDetail = {
  snapshot_id: string;
  file_path: string;
  language: string;
  created_at: string;
  note: string;
  before: string;
  after: string;
  diff_preview: string;
};

export type SimilarityItem = {
  file_path: string;
  chunk_name: string;
  chunk_type: string;
  similarity_score: number;
  code_text: string;
};

export type SimilarityResponse = {
  embedding_backend: string;
  results: SimilarityItem[];
};

export type InsightResponse = {
  summary: string;
  probable_root_cause: string;
  action_items: string[];
  references: Array<{
    file_path: string;
    chunk_name: string;
    similarity_score: number;
  }>;
  provider: string;
};

export type GitClusterSummary = {
  cluster_id: string;
  author: string;
  day: string;
  commit_count: number;
  files: string[];
  summary: string;
};

export type GitSummaryResponse = {
  project_id: string;
  commit_count: number;
  clusters: GitClusterSummary[];
};

export type PRReviewReference = {
  file_path: string;
  chunk_name: string;
  similarity_score: number;
};

export type PRReviewFinding = {
  finding_id: string;
  risk_type: string;
  severity: string;
  risk_score: number;
  file_path: string;
  line_number: number;
  code_snippet: string;
  reason: string;
  ai_explanation: string;
  suggested_fix: string;
  references: PRReviewReference[];
};

export type PRReviewImpactNode = {
  id: string;
  type: string;
  name: string;
  file_path: string;
};

export type PRReviewImpactEdge = {
  source: string;
  target: string;
  type: string;
};

export type PRReviewResponse = {
  provider: string;
  embedding_backend: string;
  pr_number: number;
  repository: string;
  title: string;
  changed_files: string[];
  findings: PRReviewFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  impact_graph: {
    nodes: PRReviewImpactNode[];
    edges: PRReviewImpactEdge[];
  };
};

type GithubIngestPayload = {
  repoUrl: string;
  branch: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api";
const DEV_JWT =
  process.env.NEXT_PUBLIC_DEV_JWT ||
  "eyJhbGciOiJIUzI1NiJ9.eyJvcmdfaWQiOiJkZW1vLW9yZyJ9.fake";

export function getStatusStreamUrl(projectId: string): string {
  const token = encodeURIComponent(DEV_JWT);
  return `${API_BASE_URL}/status/${projectId}/stream?access_token=${token}`;
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error while calling API.";
}

async function parseResponse(response: Response): Promise<IngestResponse> {
  const data = (await response.json()) as Partial<IngestResponse>;
  if (!response.ok) {
    const message = typeof data.status === "string" ? data.status : response.statusText;
    throw new Error(message || "API request failed.");
  }
  return {
    project_id: data.project_id ?? "",
    file_count: data.file_count ?? 0,
    status: data.status ?? "processing",
  };
}

export async function ingestGithub(payload: GithubIngestPayload): Promise<IngestResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({
        repo_url: payload.repoUrl,
        branch: payload.branch,
      }),
    });
    return parseResponse(response);
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function ingestZip(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DEV_JWT}` },
      body: formData,
    });
    return parseResponse(response);
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchEnvironmentScan(): Promise<EnvironmentScanResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/scan-environment`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to scan environment.");
    }
    return (await response.json()) as EnvironmentScanResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchProjectMap(projectId: string): Promise<MapResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/map/${projectId}`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to load map.");
    }
    return (await response.json()) as MapResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function diagnoseError(
  projectId: string,
  errorText: string,
): Promise<DiagnoseResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({ project_id: projectId, error_text: errorText }),
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to diagnose error.");
    }
    return (await response.json()) as DiagnoseResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function askRepository(payload: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({ project_id: payload.projectId, question: payload.question }),
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to query repository chat.");
    }
    return (await response.json()) as ChatResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchExplorerTree(projectId: string): Promise<ExplorerTreeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/explorer/${projectId}/tree`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to load explorer tree.");
    }
    return (await response.json()) as ExplorerTreeResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchExplorerFile(
  projectId: string,
  filePath: string,
): Promise<ExplorerFileResponse> {
  try {
    const path = encodeURIComponent(filePath);
    const response = await fetch(`${API_BASE_URL}/explorer/${projectId}/file?file_path=${path}`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to load source file.");
    }
    return (await response.json()) as ExplorerFileResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function saveSandboxFix(payload: {
  projectId: string;
  filePath: string;
  updatedContent: string;
  note: string;
}): Promise<SandboxFixSummary> {
  try {
    const response = await fetch(`${API_BASE_URL}/sandbox/fix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({
        project_id: payload.projectId,
        file_path: payload.filePath,
        updated_content: payload.updatedContent,
        note: payload.note,
      }),
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to save sandbox fix.");
    }
    return (await response.json()) as SandboxFixSummary;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchSandboxFixes(projectId: string): Promise<SandboxFixListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/sandbox/${projectId}/fixes`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to load saved fixes.");
    }
    return (await response.json()) as SandboxFixListResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchSandboxFixDetail(
  projectId: string,
  snapshotId: string,
): Promise<SandboxFixDetail> {
  try {
    const response = await fetch(`${API_BASE_URL}/sandbox/${projectId}/fixes/${snapshotId}`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to load fix detail.");
    }
    return (await response.json()) as SandboxFixDetail;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function findSimilarCode(payload: {
  projectId: string;
  codeText: string;
  limit?: number;
}): Promise<SimilarityResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/similarity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({
        project_id: payload.projectId,
        code_text: payload.codeText,
        limit: payload.limit ?? 5,
      }),
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to compute similar code.");
    }
    return (await response.json()) as SimilarityResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function generateInsights(payload: {
  projectId: string;
  errorText: string;
  topK?: number;
}): Promise<InsightResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({
        project_id: payload.projectId,
        error_text: payload.errorText,
        top_k: payload.topK ?? 3,
      }),
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to generate AI insights.");
    }
    return (await response.json()) as InsightResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchGitSummary(projectId: string): Promise<GitSummaryResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/git-summary/${projectId}`, {
      headers: { Authorization: `Bearer ${DEV_JWT}` },
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to load Git summary.");
    }
    return (await response.json()) as GitSummaryResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function analyzePullRequest(payload: {
  projectId: string;
  prUrl: string;
  includeAI?: boolean;
  maxFindings?: number;
}): Promise<PRReviewResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/pr-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEV_JWT}`,
      },
      body: JSON.stringify({
        project_id: payload.projectId,
        pr_url: payload.prUrl,
        include_ai: payload.includeAI ?? true,
        max_findings: payload.maxFindings ?? 20,
      }),
    });
    if (!response.ok) {
      throw new Error(response.statusText || "Failed to analyze PR.");
    }
    return (await response.json()) as PRReviewResponse;
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}
