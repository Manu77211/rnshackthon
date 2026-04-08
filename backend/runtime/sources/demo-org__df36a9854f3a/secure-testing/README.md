# secure-testing

A Next.js application purpose-built as a testing target for the **SecDev** autonomous security platform.

## What This Is

This is a realistic multi-page web application with API endpoints that the SecDev testing pipeline can deploy into an E2B sandbox and validate against. It includes:

- **6 Page Routes** — Home, Dashboard, Users, Products, Settings, About
- **5 API Endpoints** — `/api/health`, `/api/users`, `/api/products`, `/api/search`, `/api/config`
- **Security Patterns** — Some headers present, some intentionally missing, server info disclosure, form inputs
- **Performance Baseline** — Lightweight pages for concurrent load testing

## SecDev Test Coverage

| Agent | Target | Expected |
|-------|--------|----------|
| Test Suite | HTTP 200 on all 6 pages | ✅ All pass |
| API Tests | 5 endpoints × 5 HTTP methods | ✅ Valid responses |
| Security Scan | Headers, XSS, cookies, disclosure | ⚠️ Findings reported |
| Performance | 20 req/route, 10 concurrent | ✅ Low latency |
| Vibetest | Links, console, a11y, UI | ⚠️ Some findings |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy via SecDev

1. Go to SecDev Console → Dashboard
2. Click "New Deployment"
3. Paste: `https://github.com/Manu77211/secure-testing.git`
4. Deploy and run all test suites
