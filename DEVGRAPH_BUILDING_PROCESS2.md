# DevGraph Master Build Process v2 (Prompt-2 Aligned)

## 1) Purpose of This Document
This file captures the strongest implementation ideas from Prompt 2 and translates them into an approval-first execution plan for DevGraph.

This is planning only. No implementation starts until you approve.

## 2) Strategic Positioning
DevGraph remains the unified platform vision:
- Environment health intelligence
- AI code review intelligence
- Commit story intelligence
- Shared graph backbone for all three

Prompt-2 enhancements we adopt:
- Multi-layer graph thinking (AST, CFG, DFG, call, dependency)
- Strong real-time UX emphasis
- AI-generated review comments and optional auto-fix proposals
- Hackathon-ready demo mode with measurable outcomes

## 3) Architecture Choice (Practical Hybrid)

### Core Decision
Use modular monolith first, service-ready boundaries.

Why:
- Faster for MVP/hackathon timelines
- Easier local development and debugging
- Can evolve into microservices later

### Phase-1 Runtime Layout
- Backend API (FastAPI): single deployable
- Worker process: background jobs (analysis)
- Frontend (Next.js): separate deployable
- Datastores: PostgreSQL + Neo4j + Redis

### Future Microservice Split (optional after MVP)
- Graph Processing Service
- AI Analysis Service
- Integration/Webhook Service
- Realtime Gateway Service

## 4) Stack Decisions (Locked)

### Backend
- Python 3.11
- FastAPI async
- Pydantic v2
- Async SQLAlchemy + psycopg3
- JWT auth
- pytest

### Graph + Analysis
- Neo4j primary graph store
- NetworkX for in-memory transforms/prototyping
- Tree-sitter parsers for language-aware structure extraction
- Baseline pattern engine before advanced GNN

### AI Layer
- Embeddings abstraction (GraphCodeBERT-compatible interface)
- LLM abstraction for summaries/comments
- Provider-agnostic adapter (OpenAI/Anthropic/local)

### Frontend
- Next.js (App Router) + TypeScript
- Cytoscape.js for 2D graph MVP
- Optional 3D graph view as demo enhancement
- Framer Motion for meaningful transitions

### Infra
- Docker Compose for local full stack
- GitHub Actions for CI

## 5) Engineering Guardrails (Must Follow)
- async/await for all IO
- Type hints everywhere (backend)
- Prefer functions <= 40 lines where practical
- routers only in routers/
- DB logic in crud.py / data access modules
- business logic in services/
- Pydantic schemas in schemas/
- secrets only via os.getenv()
- no SELECT *
- no unparameterized raw SQL
- no global mutable state
- no print in production paths
- multitenant: always filter by org_id from JWT
- never trust org_id from request body
- client error contract always:
  - {"error": "...", "code": 400, "detail": "..."}

## 6) Prompt-2 Feature Adoption Matrix

### Adopt Now (MVP)
- Multi-layer graph model contract
- Vulnerability pattern detection (rules + semgrep-like integrations later)
- Review comment generation pipeline
- Real-time progress updates via WebSocket
- Graph-driven blast radius summary

### Adopt in Phase 2
- Optional auto-fix code suggestions (human-reviewed)
- richer performance diagnostics
- advanced architecture rule checks

### Adopt Later (Stretch)
- GNN training/inference in production path
- distributed processing (Ray)
- ForceGraph 3D as default visualization
- full Kubernetes demo environment

## 7) Data Model Plan

### PostgreSQL (metadata)
- repositories
- pull_requests
- analyses
- review_comments
- vulnerability_patterns
- analysis_runs

### Neo4j (graph)
Node labels:
- Repository, File, Function, Class, Module
- Commit, PullRequest, Author
- Pattern, Issue, Dependency

Edge types:
- CALLS, IMPORTS, DEFINES, MODIFIES
- PART_OF, AUTHORED, INTRODUCES, FIXES
- DEPENDS_ON, MATCHES_PATTERN, IMPACTS

Required properties:
- id, org_id, created_at, updated_at
- severity/score/confidence where relevant

## 8) API Contract v2

### REST
- POST /api/v1/review/analyze
- GET /api/v1/review/{analysis_id}
- GET /api/v1/review/{analysis_id}/graph
- POST /api/v1/patterns/detect
- POST /api/v1/autofix/suggest
- POST /api/v1/environment/scan
- POST /api/v1/commit-story/generate

### WebSocket
- /ws/analysis/{analysis_id}
Events:
- analysis.started
- analysis.progress
- analysis.partial_result
- analysis.completed
- analysis.failed

## 9) Execution Roadmap (Approval Gates)

### Phase 0: Foundation
- Repo structure and baseline configs
- Auth, tenant middleware, error envelope
- Docker compose baseline
- CI checks (lint, type, unit tests)

Exit criteria:
- Local stack boots; CI passes on baseline

### Phase 1: Graph Backbone + Review MVP
- parser pipeline (initial language set)
- graph ingestion (Neo4j)
- review analyze endpoint with baseline checks
- web dashboard list + analysis detail + graph panel

Exit criteria:
- PR analysis end-to-end with graph + findings

### Phase 2: Realtime + Insight Quality
- WebSocket streaming progress
- LLM summary + reviewer focus points
- impact/blast radius metrics

Exit criteria:
- live progress and actionable summary quality acceptable

### Phase 3: Environment + Commit Story Modules
- environment scan/analyze
- commit ingestion and narrative generation
- unified cross-module dashboard

Exit criteria:
- all 3 pillars working with shared graph infra

### Phase 4: Demo and Hardening
- demo mode script
- test expansion and perf checks
- UX polish and reliability tuning

Exit criteria:
- stable demo with reproducible script

## 10) Testing Strategy v2

### Backend
- unit tests for analyzers/services/scoring
- integration tests for API + DB + Neo4j
- auth and org_id isolation tests

### Frontend
- component tests for key panels
- integration tests for API-driven flows
- e2e test for analyze -> graph -> comments path

### Non-Functional
- latency budgets for analysis endpoints
- memory/CPU profiling on representative repos
- false positive tracking for vulnerability detections

## 11) CI/CD Baseline
Create GitHub Actions workflows:
- backend-ci.yml: lint, type, pytest
- frontend-ci.yml: lint, type, tests, build
- docker-ci.yml: build images and smoke test

## 12) Demo Plan (Prompt-2 Inspired)
- Step 1: trigger PR analysis
- Step 2: show real-time progress updates
- Step 3: visualize graph and issue hotspots
- Step 4: show AI review comments and suggested fixes
- Step 5: show impact metrics and summary

Key demo KPIs:
- analysis duration
- issues detected by severity
- estimated review time saved

## 13) Reusable Execution Prompt (v2)
Use this prompt for all implementation turns:

"Implement DevGraph by following DEVGRAPH_BUILDING_PROCESS2.md phase by phase. Enforce async FastAPI patterns, Pydantic v2 models, JWT multitenancy with org_id from token only, strict error envelope, parameterized DB access only, and tests for each delivered capability. Implement only the approved current phase and stop for review before the next phase."

## 14) Approval Workflow
- You approve this v2 document
- We start Phase 0 only
- We pause at each phase for your explicit go-ahead

---
Status: Draft complete and waiting for your implementation approval.
