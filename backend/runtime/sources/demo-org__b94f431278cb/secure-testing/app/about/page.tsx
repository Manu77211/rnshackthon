export default function AboutPage() {
  return (
    <div>
      <h1>About SecureTest</h1>
      <p style={{ maxWidth: "640px", marginTop: "0.5rem" }}>
        SecureTest is a purpose-built Next.js application designed as a testing target for the
        SecDev autonomous security platform. It provides realistic pages, API endpoints, and
        intentional security patterns that the SecDev testing pipeline can validate.
      </p>

      <div className="grid grid-2" style={{ marginTop: "2rem" }}>
        <div className="card">
          <h2>Architecture</h2>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <strong style={{ color: "#fff" }}>Framework:</strong> Next.js 14 (App Router)
            </li>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <strong style={{ color: "#fff" }}>Language:</strong> TypeScript
            </li>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <strong style={{ color: "#fff" }}>Pages:</strong> 6 routes (/, /dashboard, /users, /products, /settings, /about)
            </li>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <strong style={{ color: "#fff" }}>API:</strong> 5 endpoints (/api/health, /api/users, /api/products, /api/search, /api/config)
            </li>
            <li style={{ padding: "0.5rem 0", color: "#ccc" }}>
              <strong style={{ color: "#fff" }}>Data:</strong> In-memory mock data (no database required)
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>Security Testing Targets</h2>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <span className="badge badge-green">Pass</span> X-Content-Type-Options header set
            </li>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <span className="badge badge-red">Fail</span> Missing Content-Security-Policy
            </li>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <span className="badge badge-red">Fail</span> Missing Strict-Transport-Security
            </li>
            <li style={{ padding: "0.5rem 0", borderBottom: "1px solid #222", color: "#ccc" }}>
              <span className="badge badge-yellow">Warn</span> Server version disclosed via X-Powered-By
            </li>
            <li style={{ padding: "0.5rem 0", color: "#ccc" }}>
              <span className="badge badge-green">Pass</span> XSS payloads properly escaped
            </li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>How to Use</h2>
        <ol style={{ paddingLeft: "1.25rem", marginTop: "0.75rem", color: "#ccc", lineHeight: "2" }}>
          <li>Deploy this repo via SecDev using the GitHub integration</li>
          <li>Wait for the sandbox to build and go live</li>
          <li>Run all test suites from the SecDev console Testing tab</li>
          <li>Review results — security findings, performance metrics, and route health</li>
          <li>Use the suggestions to improve your security posture</li>
        </ol>
      </div>
    </div>
  );
}
