from pydantic import BaseModel, Field


class GithubIngestRequest(BaseModel):
    repo_url: str = Field(min_length=10)
    branch: str = Field(default="main", min_length=1)


class IngestResponse(BaseModel):
    project_id: str
    file_count: int
    status: str


class EnvironmentSystemInfo(BaseModel):
    os: str
    python_version: str
    node_version: str
    git_version: str
    ram_gb: float | None = None
    disk_total_gb: float
    disk_free_gb: float


class EnvironmentDependencyStatus(BaseModel):
    missing_python: list[str]
    missing_node: list[str]


class EnvironmentScanResponse(BaseModel):
    health_score: int
    issues_count: int
    system: EnvironmentSystemInfo
    dependencies: EnvironmentDependencyStatus


class GitClusterSummary(BaseModel):
    cluster_id: str
    author: str
    day: str
    commit_count: int
    files: list[str]
    summary: str


class GitSummaryResponse(BaseModel):
    project_id: str
    commit_count: int
    clusters: list[GitClusterSummary]


class AnalyzeNode(BaseModel):
    id: str
    type: str
    name: str
    file_path: str
    line_start: int | None = None
    line_end: int | None = None
    embedding: list[float] | None = None


class AnalyzeEdge(BaseModel):
    source: str
    target: str
    type: str


class AnalyzeRepoResponse(BaseModel):
    project_id: str
    nodes: list[AnalyzeNode]
    edges: list[AnalyzeEdge]
    stats: dict[str, int]


class StatusResponse(BaseModel):
    project_id: str
    status: str
    progress: int


class DiagnoseRequest(BaseModel):
    project_id: str = Field(min_length=3)
    error_text: str = Field(min_length=8)


class DiagnoseResult(BaseModel):
    file_path: str
    chunk_name: str
    chunk_type: str
    code_text: str
    similarity_score: float
    reason: str


class DiagnoseResponse(BaseModel):
    results: list[DiagnoseResult]


class ChatRequest(BaseModel):
    project_id: str = Field(min_length=3)
    question: str = Field(min_length=6)


class ChatReference(BaseModel):
    file_path: str
    chunk_name: str
    similarity_score: float


class ChatResponse(BaseModel):
    answer: str
    references: list[ChatReference]


class ExplorerFileItem(BaseModel):
    file_path: str
    language: str
    line_count: int


class ExplorerTreeResponse(BaseModel):
    files: list[ExplorerFileItem]


class ExplorerFileResponse(BaseModel):
    file_path: str
    language: str
    content: str


class SandboxFixRequest(BaseModel):
    project_id: str = Field(min_length=3)
    file_path: str = Field(min_length=1)
    updated_content: str = Field(min_length=1)
    note: str = Field(default="LLM fix draft", min_length=3)


class SandboxFixSummary(BaseModel):
    snapshot_id: str
    file_path: str
    created_at: str
    note: str


class SandboxFixListResponse(BaseModel):
    items: list[SandboxFixSummary]


class SandboxFixDetailResponse(BaseModel):
    snapshot_id: str
    file_path: str
    language: str
    created_at: str
    note: str
    before: str
    after: str
    diff_preview: str


class SandboxRunRequest(BaseModel):
    project_id: str = Field(min_length=3)
    command: str | None = Field(default=None, min_length=1, max_length=220)
    timeout_sec: int = Field(default=120, ge=15, le=900)
    include_ai_insights: bool = True


class SandboxRunInsight(BaseModel):
    summary: str
    probable_root_cause: str
    action_items: list[str]
    provider: str


class SandboxRunResponse(BaseModel):
    project_id: str
    profile: str
    command: str
    exit_code: int
    timed_out: bool
    duration_ms: int
    stdout: str
    stderr: str
    diagnosis: list[DiagnoseResult]
    insights: SandboxRunInsight | None = None


class SandboxSuggestRequest(BaseModel):
    project_id: str = Field(min_length=3)
    file_path: str = Field(min_length=1)
    instruction: str = Field(default="Fix errors and improve safety", min_length=3, max_length=300)
    error_text: str | None = Field(default=None, min_length=8)


class SandboxSuggestResponse(BaseModel):
    file_path: str
    language: str
    updated_content: str
    summary: str
    provider: str


class SimilarityRequest(BaseModel):
    project_id: str = Field(min_length=3)
    code_text: str = Field(min_length=8)
    limit: int = Field(default=5, ge=1, le=10)


class SimilarityItem(BaseModel):
    file_path: str
    chunk_name: str
    chunk_type: str
    similarity_score: float
    code_text: str


class SimilarityResponse(BaseModel):
    embedding_backend: str
    results: list[SimilarityItem]


class InsightRequest(BaseModel):
    project_id: str = Field(min_length=3)
    error_text: str = Field(min_length=8)
    top_k: int = Field(default=3, ge=1, le=5)


class InsightReference(BaseModel):
    file_path: str
    chunk_name: str
    similarity_score: float


class InsightResponse(BaseModel):
    summary: str
    probable_root_cause: str
    action_items: list[str]
    references: list[InsightReference]
    provider: str


class PRReviewRequest(BaseModel):
    project_id: str = Field(min_length=3)
    pr_url: str = Field(min_length=18)
    include_ai: bool = True
    max_findings: int = Field(default=20, ge=1, le=60)


class PRReviewReference(BaseModel):
    file_path: str
    chunk_name: str
    similarity_score: float


class PRReviewFinding(BaseModel):
    finding_id: str
    risk_type: str
    severity: str
    risk_score: float
    file_path: str
    line_number: int
    code_snippet: str
    reason: str
    ai_explanation: str
    suggested_fix: str
    references: list[PRReviewReference]


class PRReviewImpactNode(BaseModel):
    id: str
    type: str
    name: str
    file_path: str


class PRReviewImpactEdge(BaseModel):
    source: str
    target: str
    type: str


class PRReviewImpactGraph(BaseModel):
    nodes: list[PRReviewImpactNode]
    edges: list[PRReviewImpactEdge]


class PRReviewResponse(BaseModel):
    provider: str
    embedding_backend: str
    pr_number: int
    repository: str
    title: str
    changed_files: list[str]
    findings: list[PRReviewFinding]
    summary: dict[str, int]
    impact_graph: PRReviewImpactGraph
