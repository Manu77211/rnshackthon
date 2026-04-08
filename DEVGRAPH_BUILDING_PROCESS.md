# DevGraph Master Build Process (Approval First)

## 1) Mission and Product Definition
DevGraph is a unified developer intelligence platform that combines environment diagnostics, code review intelligence, and commit narrative insights on top of one shared knowledge graph.

## 2) Core Product Goals
- Solve three modules using one shared graph backbone.
- Deliver high-clarity visual graph UX for demos and daily use.
- Provide actionable recommendations that reduce developer friction.
- Support near real-time updates and event-driven analysis.
- Keep implementation production-oriented (typed, tested, secured).

## 3) System Architecture (Canonical)

### Interfaces
- VS Code Extension (primary experience)
- Web Dashboard (graph + reports)
- CLI (automation and CI entrypoint)

### API Layer
- FastAPI (async REST + WebSocket)

### Domain Services
- Environment Health Monitor
- AI Code Review Co-Pilot
- Commit Story Generator

### Intelligence Layer
- Pattern engine, impact analysis, anomaly signals
- LLM insight generation
- Embedding-based similarity

### Graph Layer
- Primary: Neo4j
- Fallback: NetworkX (prototype mode)

### Ingestion Layer
- Static analysis parser pipeline
- Git history parser
- Environment scanner

## 4) Required Technology Decisions

### Backend
- Python 3.11 + FastAPI
- Async SQLAlchemy + psycopg3 for relational persistence where needed
- Pydantic v2 schemas
- JWT auth
- pytest for tests
- Secrets only via os.getenv()

### Frontend
- Next.js + TypeScript (App Router)
- Server/client components and server actions where appropriate
- Graph rendering library: Cytoscape.js (primary)

### Data and AI
- Neo4j for graph persistence
- Optional Redis for caching
- Embeddings model for semantic similarity (CodeBERT class)
- LLM abstraction for summaries/recommendations

## 5) Non-Negotiable Engineering Rules
- Use async/await for all IO paths.
- Type hints on all backend functions.
- Keep functions under 40 lines when practical.
- Project structure discipline:
  - routers/: route handlers only
  - crud.py: database access
  - schemas/: Pydantic models
  - services/: business logic
- No raw unparameterized SQL.
- No SELECT *.
- No global mutable state.
- Validate all external input.
- No print() in production paths.
- Multi-tenant safety: always filter by org_id from JWT (never from request body).
- Error shape to clients is always:
  - {"error": str, "code": int, "detail": str}
- Never leak stack traces to clients.

## 6) Feature Scope (MVP First)

### Feature A: Environment Health Monitor
- Scan system/tool/dependency/env state.
- Build environment graph nodes and edges.
- Compute health score and prioritized issues.
- Offer safe auto-fixes with dry-run mode.
- Render issue-centric graph with severity coloring.

### Feature B: AI Code Review Co-Pilot
- Parse PR diffs and changed files.
- Detect bug/security/architecture risks.
- Compute blast radius using graph traversal.
- Generate reviewer-facing AI insights.
- Support GitHub comment/status integration.

### Feature C: Commit Story Generator
- Parse commit history into semantic event timeline.
- Link commits to files/functions/issues/PRs.
- Generate human-readable release and sprint narratives.
- Highlight risk clusters and collaboration patterns.

## 7) Knowledge Graph Contract

### Primary Node Types
- CodeUnit, File, Function, Class
- Commit, Author, PR, Issue
- Tool, Dependency, EnvironmentEntity

### Primary Edge Types
- CALLS, IMPORTS, MODIFIES, DEPENDS_ON
- AUTHORED, FIXES, PART_OF, REQUIRES
- CONFLICTS_WITH, IMPACTS

### Required Properties
- ids, timestamps, org_id
- metadata and quality metrics
- optional embedding vectors

## 8) API and Realtime Contract

### REST Endpoints (initial)
- POST /api/v1/environment/scan
- GET /api/v1/environment/health
- POST /api/v1/review/analyze
- POST /api/v1/commit-story/generate
- GET /api/v1/graph/subgraph

### WebSocket Events
- scan.progress
- analysis.progress
- graph.updated
- insights.ready

## 9) Delivery Plan with Approval Gates

### Phase 0: Foundation Setup
- Monorepo folders and baseline configs.
- Backend app skeleton + auth + error middleware.
- Frontend app shell + graph page scaffold.
- Docker compose with Neo4j and core services.

Exit criteria:
- Services boot locally and health checks pass.

### Phase 1: Shared Graph Backbone
- Graph schema definitions.
- Ingestion adapters (env, static, git minimal).
- Graph write/read APIs.

Exit criteria:
- Sample repo ingests into graph and visualizes.

### Phase 2: Environment Health MVP
- Scanner + analyzer + health score.
- Issue list API + graph visualization.
- Dry-run auto-fix commands.

Exit criteria:
- End-to-end scan to actionable dashboard works.

### Phase 3: Code Review MVP
- PR diff parser.
- Bug/security/risk checks baseline.
- Blast radius graph + AI summary generation.

Exit criteria:
- PR analysis returns prioritized findings + graph.

### Phase 4: Commit Story MVP
- Commit ingestion + linkage.
- Narrative generator with timeline output.
- Dashboard story view.

Exit criteria:
- Story generation works on target demo repository.

### Phase 5: Hardening and Demo Readiness
- Test coverage expansion.
- Performance and reliability checks.
- UX polish and scripted demo flow.

Exit criteria:
- Stable demo with repeatable setup steps.

## 10) Testing Strategy

### Backend
- Unit: services, scoring, graph adapters.
- Integration: API + DB + graph interactions.
- Security: auth + tenant filtering tests.

### Frontend
- Unit: components and state logic.
- Integration: API contracts and event updates.
- E2E: critical user journeys.

### Quality Gates
- Lint and type checks pass.
- Minimum agreed coverage thresholds.
- Critical workflows tested in CI.

## 11) CI/CD Baseline (GitHub Actions)
- Lint and type check jobs.
- Backend and frontend test jobs.
- Build artifacts and optional Docker image build.
- Optional preview deployment workflow.

## 12) Demo Strategy
- Scenario 1: environment issue detection and auto-fix preview.
- Scenario 2: PR risk analysis and blast radius exploration.
- Scenario 3: commit history turned into actionable narrative.
- End with quantified value (time saved, risk surfaced, effort reduced).

## 13) Implementation Prompt (Reusable)
Use this prompt whenever we begin execution work:

"Build DevGraph incrementally using the approved DevGraph Master Build Process. Respect architecture and constraints exactly: Python 3.11 + FastAPI + async patterns, Pydantic v2, JWT, strict org_id multitenancy from JWT, parameterized DB access only, no SELECT *, typed functions, function length <= 40 lines where practical, and standardized error responses. Implement only the approved current phase, include tests, and do not start the next phase until explicit approval."

## 14) Approval Workflow
- Step 1: You approve this document as the execution source.
- Step 2: We start Phase 0 implementation only.
- Step 3: At each phase end, we stop for review and your go-ahead.

---
Status: Draft prepared for your approval.
