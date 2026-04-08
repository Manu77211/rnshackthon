export default function DashboardPage() {
  const stats = [
    { label: "Total Deployments", value: "142", change: "+12%" },
    { label: "Active Sandboxes", value: "8", change: "+3" },
    { label: "Tests Passed", value: "1,247", change: "98.2%" },
    { label: "Security Score", value: "A-", change: "↑ from B+" },
  ];

  const recentActivity = [
    { action: "Deployed", target: "api-gateway v2.3.1", time: "2 min ago", status: "success" },
    { action: "Security Scan", target: "frontend-app", time: "15 min ago", status: "warning" },
    { action: "Test Suite", target: "auth-service", time: "1 hour ago", status: "success" },
    { action: "Deployed", target: "billing-api v1.8.0", time: "3 hours ago", status: "success" },
    { action: "Performance Test", target: "cdn-proxy", time: "5 hours ago", status: "fail" },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Overview of your deployment and testing activity.</p>

      <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            <h2 style={{ fontSize: "2rem", color: "#fff", margin: "0.25rem 0" }}>{s.value}</h2>
            <span className="badge badge-green">{s.change}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2>Recent Activity</h2>
        <table>
          <thead>
            <tr><th>Action</th><th>Target</th><th>Time</th><th>Status</th></tr>
          </thead>
          <tbody>
            {recentActivity.map((a, i) => (
              <tr key={i}>
                <td>{a.action}</td>
                <td><code>{a.target}</code></td>
                <td style={{ color: "#666" }}>{a.time}</td>
                <td>
                  <span className={`status-dot ${a.status === "success" ? "dot-green" : a.status === "warning" ? "dot-yellow" : "dot-red"}`}></span>
                  {a.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
