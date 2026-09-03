"use client";

import { useState } from "react";

import { API_URL } from "@/lib/api";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("access_token", data.access_token);
      setMessage("Logged in successfully!");
      window.location.href = "/jobs";
    } else {
      setMessage(data.detail || "Login failed.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "40px 32px",
          boxShadow: "0 1px 3px rgba(18,32,61,0.06)",
        }}
      >
        <p
          className="font-display"
          style={{ fontSize: "28px", fontWeight: 600, margin: "0 0 4px" }}
        >
          Welcome back
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", margin: "0 0 28px" }}>
          Sign in to continue to Talenta
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              marginTop: "8px",
              padding: "11px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Sign in
          </button>
        </form>

        {message && (
          <p style={{ fontSize: "13px", color: message.includes("success") ? "var(--success)" : "var(--danger)", marginTop: "16px" }}>
            {message}
          </p>
        )}

        <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "24px", textAlign: "center" }}>
          No account? <a href="/register" style={{ color: "var(--accent)", fontWeight: 500 }}>Register</a>
        </p>
      </div>
    </div>
  );
}