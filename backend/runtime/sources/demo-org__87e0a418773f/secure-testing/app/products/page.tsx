export default function ProductsPage() {
  const products = [
    { id: 1, name: "SecDev Pro", price: "$49/mo", category: "Platform", stock: "Unlimited" },
    { id: 2, name: "Sandbox Credits", price: "$0.10/hr", category: "Infrastructure", stock: "On-demand" },
    { id: 3, name: "Enterprise Plan", price: "Custom", category: "Platform", stock: "Contact Sales" },
    { id: 4, name: "CI/CD Pipeline", price: "$29/mo", category: "Automation", stock: "Unlimited" },
    { id: 5, name: "Security Add-on", price: "$19/mo", category: "Security", stock: "Unlimited" },
  ];

  return (
    <div>
      <h1>Products</h1>
      <p>Browse available plans and add-ons.</p>

      <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
        {products.map((p) => (
          <div key={p.id} className="card">
            <span className="badge badge-blue">{p.category}</span>
            <h3 style={{ marginTop: "0.75rem", color: "#fff" }}>{p.name}</h3>
            <p style={{ fontSize: "1.5rem", color: "#3b82f6", fontWeight: 700, margin: "0.5rem 0" }}>{p.price}</p>
            <p style={{ fontSize: "0.75rem" }}>Availability: {p.stock}</p>
            <button className="btn btn-outline" style={{ marginTop: "0.75rem", width: "100%" }}>
              Learn More
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
