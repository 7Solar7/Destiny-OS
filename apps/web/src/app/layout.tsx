import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Destiny OS",
  description: "Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#0a0a0a", color: "#e0e0e0" }}>
        <nav style={{ padding: "12px 24px", borderBottom: "1px solid #222", background: "#111" }}>
          <a href="/" style={{ color: "#60a5fa", fontWeight: 700, textDecoration: "none", fontSize: 18 }}>
            Destiny OS
          </a>
          <span style={{ color: "#666", marginLeft: 12, fontSize: 14 }}>Dashboard</span>
        </nav>
        <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
