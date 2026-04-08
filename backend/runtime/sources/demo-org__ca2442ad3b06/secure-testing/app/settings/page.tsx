export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Configure your application preferences.</p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2>General</h2>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="app-name" style={{ display: "block", fontSize: "0.875rem", color: "#999", marginBottom: "0.25rem" }}>
              Application Name
            </label>
            <input id="app-name" type="text" defaultValue="SecureTest" />
          </div>
          <div>
            <label htmlFor="app-url" style={{ display: "block", fontSize: "0.875rem", color: "#999", marginBottom: "0.25rem" }}>
              Application URL
            </label>
            <input id="app-url" type="url" defaultValue="https://securetest.example.com" />
          </div>
          <div>
            <label htmlFor="description" style={{ display: "block", fontSize: "0.875rem", color: "#999", marginBottom: "0.25rem" }}>
              Description
            </label>
            <textarea id="description" rows={3} defaultValue="A Next.js application for SecDev testing." />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Notifications</h2>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ccc", fontSize: "0.875rem" }}>
            <input type="checkbox" defaultChecked /> Email notifications for deployments
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ccc", fontSize: "0.875rem" }}>
            <input type="checkbox" defaultChecked /> Slack alerts for failed tests
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ccc", fontSize: "0.875rem" }}>
            <input type="checkbox" /> Weekly security digest
          </label>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ color: "#ef4444" }}>Danger Zone</h2>
        <p style={{ marginTop: "0.5rem" }}>Irreversible actions — proceed with caution.</p>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-danger">Delete Application</button>
          <button className="btn btn-outline">Reset All Data</button>
        </div>
      </div>
    </div>
  );
}
