# DevGraph / CodeLens AI

An intelligent developer productivity platform that unifies:

1. Dev environment health monitoring
2. Code graph + semantic analysis
3. Commit intelligence and explainable AI insights

The core idea is simple: **one contextual graph + one workflow surface** for faster decisions across local setup, code understanding, and debugging.

## Why This Project Exists

This hackathon track asks for tools that reduce manual effort and provide contextual, workflow-ready intelligence, not just dashboards.

We are solving this by building a connected platform where developers can:

1. Validate local readiness before coding
2. Analyze repository structure and dependencies quickly
3. Diagnose errors and get contextual AI guidance
4. Convert noisy commit history into meaningful summaries

This directly targets the track requirement: **faster action, fewer failures, deeper system understanding**.

## Problem Statements We Address

## Problem Statement 1: Dev Environment Health Monitor

### Problem
Developers lose time to version mismatch, missing dependencies, and environment drift.

### Our Solution
Phase 3 Environment Scanner provides:

1. System info scan
2. Dependency gap scan
3. Health score
4. Actionable status in one UI panel

### What It Checks

1. System tools and machine context
	- Python version
	- Node version
	- Git version
	- OS
	- RAM
	- Disk free/total

2. Dependency status
	- Reads backend requirements.txt
	- Reads frontend package.json
	- Compares against installed Python and Node packages
	- Returns missing package lists

3. Health score
	- Formula: `max(0, 100 - issues * 10)`

### Why This Is Useful

1. Prevents wasted setup/debug hours
2. Makes onboarding predictable
3. Reduces "works on my machine" incidents
4. Gives teams a shared, measurable readiness baseline

## Problem Statement 2: AI-Powered Code Review Co-Pilot

### Current Scope Delivered

1. Repository parsing into graph-ready chunks
2. Dependency map visualization
3. Similar-function search
4. Diagnose panel with contextual references
5. AI insight generation (with fallback when external provider not configured)

### Why This Matters
Even before full PR bot integration, this already reduces manual triage time by helping developers locate probable fault paths and related code rapidly.

## Problem Statement 3: Commit Story

### Current Scope Delivered

1. Git commit extraction
2. Commit clustering by author/day/file overlap
3. Cluster summary API output

### Why This Matters
Raw git logs are hard to consume; clustered summaries make project evolution easier to explain in standups, release notes, and onboarding.

## What Makes Our Approach Different

Most solutions in this space do one isolated thing:

1. Only env checking
2. Only static code analysis
3. Only commit summarization

Our differentiator is **unified contextual intelligence**:

1. Shared data model across environment + code + history
2. Single operator workflow in one dashboard
3. Explainable outputs with references, not opaque scores only
4. Progressive automation path from insight to fix guidance

This is closer to how modern engineering productivity platforms are built.

## Architecture Overview

### Backend

1. Framework: FastAPI
2. Key capabilities:
	- Ingestion pipeline
	- AST-based parsing for Python
	- Graph generation (files, functions, classes, imports, calls)
	- Environment scanner
	- Git history summarizer
	- Similarity and insight endpoints

### Frontend

1. Framework: Next.js App Router + TypeScript
2. Key UX modules:
	- Environment Scanner (Phase 3)
	- Ingestion
	- Dependency Map
	- Diagnose
	- Sandbox
	- Chat

### Core APIs (Current)

1. `GET /api/scan-environment`
2. `POST /api/ingest`
3. `GET /api/analyze-repo/{project_id}`
4. `GET /api/git-summary/{project_id}`
5. `GET /api/map/{project_id}`
6. `POST /api/diagnose`
7. `POST /api/similarity`
8. `POST /api/insights`

## Workflow Integration Story

This is designed to fit real engineering flow:

1. Before coding
	- Run environment scan and verify readiness
2. During implementation
	- Ingest repo and inspect dependency graph
3. During debugging
	- Paste error trace, get ranked probable code paths + AI summary
4. During reporting
	- Generate commit clusters and summaries

## Measurable Productivity Improvements (How We Measure)

1. Environment readiness time
	- Baseline: manual checks across Python/Node/Git/dependencies
	- Measure: time to identify all missing tools/packages
2. Debug triage speed
	- Baseline: manual grep + context switching
	- Measure: time to first probable root-cause file
3. History comprehension speed
	- Baseline: reading raw `git log`
	- Measure: time to produce a coherent feature/fix summary

## Why This Is Not "Just a Dashboard"

1. It performs automated scans and parsing, not static display only.
2. It computes actionable outputs (missing dependencies, clustered commits, likely fault references).
3. It connects insights to developer decisions in the same workflow.
4. It is test-validated and API-driven, not mock-only.

## Evaluator Q&A (Likely Questions)

### Q1: What exact pain are you solving?
We reduce setup friction, debugging delay, and history ambiguity by combining environment validation, structural code intelligence, and commit summarization in one tool.

### Q2: Why is this better than separate scripts/tools?
Separate tools fragment context. We keep context connected so developers move from detection to understanding to action without switching systems.

### Q3: How do you ensure low overhead?
Scans are lightweight, asynchronous where needed, and scoped to actionable data instead of heavy full-system profiling.

### Q4: How do you handle cross-platform issues?
Scanner paths are defensive, subprocess calls are hardened, and missing tool states degrade gracefully instead of crashing.

### Q5: How do you avoid superficial AI output?
AI outputs are grounded by retrieved repository context and ranked references; fallback behavior keeps the system useful even without external models.

### Q6: What is the novelty?
Unified graph-driven productivity workflow across environment, code structure, diagnostics, and git history.

### Q7: What is production path after hackathon?

1. Add auto-fix command suggestions with safe confirmations
2. Add PR-native integrations (GitHub/GitLab)
3. Add policy/security checks and risk scoring
4. Add VS Code extension integration

## Current Deliverable Status (Mentor View)

1. Phase 2 complete: parser + graph creation + storage
2. Phase 3 complete: full environment scanner backend + frontend module
3. Phase 4 complete: git history parser and clustering API
4. Phase 5 complete: core API exposure and validation
5. Phase 6 in progress: graph readability and interaction polish

## Run Locally

### Backend

From `backend` directory:

```bash
c:/Users/Manu.S/Desktop/Luminus/.venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

From `frontend` directory:

```bash
npm run dev
```

Open:

1. Frontend: `http://localhost:3000`
2. Health endpoint: `http://localhost:8000/api/health`

## Mentor Demo Flow (5 Minutes)

1. Open Environment Scanner module
2. Run scan and explain health score + missing dependencies
3. Ingest a repository
4. Show dependency map and node details
5. Paste an error trace in Diagnose and generate contextual insights
6. Show git summary clusters as narrative primitive

## One-Line Pitch

**DevGraph turns setup chaos, code complexity, and git noise into a single intelligent workflow that helps developers move faster with confidence.**
