export default function HomePage() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span className="badge badge-green">Live</span>
        <h1 style={{ marginTop: "0.5rem" }}>SecureTest Application</h1>
        <p style={{ maxWidth: "640px", marginTop: "0.5rem" }}>
          A full-stack Next.js application designed to be deployed and tested by the SecDev platform.
          This app includes multiple pages, API endpoints, forms, and intentional security patterns
          that the SecDev testing pipeline can validate.
        </p>
      </div>

      <div className="grid grid-3" style={{ marginTop: "2rem" }}>
        <div className="card">
          <h3>📊 6 Pages</h3>
          <p>Multiple routes for the test suite to discover and health-check via HTTP.</p>
        </div>
        <div className="card">
          <h3>🔌 5 API Endpoints</h3>
          <p>REST API routes tested with GET, POST, PUT, DELETE, PATCH methods.</p>
        </div>
        <div className="card">
          <h3>🔒 Security Headers</h3>
          <p>Some headers present, some intentionally missing for the security scan to flag.</p>
        </div>
        <div className="card">
          <h3>⚡ Performance</h3>
          <p>Lightweight pages optimized for concurrent load testing benchmarks.</p>
        </div>
        <div className="card">
          <h3>🧪 Form Inputs</h3>
          <p>Search forms and user inputs for XSS reflection testing.</p>
        </div>
        <div className="card">
          <h3>♿ Accessibility</h3>
          <p>Semantic HTML with some intentional a11y issues for the vibetest agent.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "2rem" }}>
        <h2>Test Coverage Map</h2>
        <table>
          <thead>
            <tr>
              <th>SecDev Agent</th>
              <th>What It Tests</th>
              <th>Expected Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Test Suite</td>
              <td>HTTP 200 on all 6 page routes</td>
              <td><span className="status-dot dot-green"></span>All Pass</td>
            </tr>
            <tr>
              <td>API Tests</td>
              <td>5 API endpoints × 5 HTTP methods</td>
              <td><span className="status-dot dot-green"></span>Valid responses</td>
            </tr>
            <tr>
              <td>Security Scan</td>
              <td>Headers, XSS, cookies, info disclosure</td>
              <td><span className="status-dot dot-yellow"></span>Findings reported</td>
            </tr>
            <tr>
              <td>Performance</td>
              <td>20 requests per route, 10 concurrent</td>
              <td><span className="status-dot dot-green"></span>Low latency</td>
            </tr>
            <tr>
              <td>Vibetest</td>
              <td>Links, console errors, a11y, UI</td>
              <td><span className="status-dot dot-yellow"></span>Some findings</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
