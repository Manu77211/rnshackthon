export default function UsersPage() {
  const users = [
    { id: 1, name: "Alice Chen", email: "alice@example.com", role: "Admin", status: "active" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Developer", status: "active" },
    { id: 3, name: "Carol Davis", email: "carol@example.com", role: "Viewer", status: "inactive" },
    { id: 4, name: "Dan Wilson", email: "dan@example.com", role: "Developer", status: "active" },
    { id: 5, name: "Eve Martinez", email: "eve@example.com", role: "Admin", status: "active" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Users</h1>
          <p>Manage team members and their permissions.</p>
        </div>
        <button className="btn btn-primary">Add User</button>
      </div>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ color: "#fff", fontWeight: 500 }}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge badge-blue">{u.role}</span></td>
                <td>
                  <span className={`status-dot ${u.status === "active" ? "dot-green" : "dot-red"}`}></span>
                  {u.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
