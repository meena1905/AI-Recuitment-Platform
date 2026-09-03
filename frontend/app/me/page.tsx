"use client";

import { useState, useEffect } from "react";

export default function MePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Not logged in.");
      return;
    }
    fetch("http://localhost:8000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => setError("Session expired or invalid. Please log in again."));
  }, []);

  const roleStyle: Record<string, any> = {
    candidate: { background: "#E5EBFA", color: "var(--accent)" },
    hr: { background: "var(--success-bg)", color: "var(--success)" },
    admin: { background: "var(--warning-bg)", color: "var(--warning)" },
  };

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--danger)", fontSize: "14px", marginBottom: "12px" }}>{error}</p>
          <a href="/login" style={{ color: "var(--accent)", fontWeight: 500, fontSize: "14px" }}>Go to sign in →</a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--ink-soft)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "36px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: 600,
            margin: "0 auto 16px",
          }}
        >
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <p className="font-display" style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 4px" }}>
          {user.name}
        </p>
        <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "0 0 16px" }}>{user.email}</p>
        <span
          style={{
            ...(roleStyle[user.role] || { background: "#F0F1F5", color: "var(--ink-soft)" }),
            fontSize: "12px",
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: "20px",
            textTransform: "capitalize",
          }}
        >
          {user.role}
        </span>
      </div>
    </div>
  );
}