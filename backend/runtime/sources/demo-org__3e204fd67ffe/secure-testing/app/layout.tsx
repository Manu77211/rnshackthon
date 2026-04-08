import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SecureTest — Vulnerability Testing Target",
  description: "A deliberately vulnerable Next.js application for security testing with SecDev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <strong style={{ fontSize: "1.125rem", color: "#fff" }}>🛡️ SecureTest</strong>
          <div>
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/users">Users</a>
            <a href="/products">Products</a>
            <a href="/settings">Settings</a>
            <a href="/about">About</a>
          </div>
        </nav>
        <main className="container" style={{ marginTop: "2rem" }}>
          {children}
        </main>
        <footer>
          <p>SecureTest v1.0 — Built for SecDev security testing pipeline</p>
        </footer>
      </body>
    </html>
  );
}
