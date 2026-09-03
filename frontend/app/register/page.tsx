"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { name, email, password, role };
    if (role === "hr") body.company_name = companyName;

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      setMessage("Registered successfully! You can now log in.");
    } else {
      const data = await response.json();
      setMessage(data.detail || "Registration failed.");
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
        <p className="font-display" style={{ fontSize: "28px", fontWeight: 600, margin: "0 0 4px" }}>
          Create your account
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", margin: "0 0 28px" }}>
          Join Talenta as a candidate or hiring team
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>I am a</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", background: "white" }}
            >
              <option value="candidate">Candidate</option>
              <option value="hr">HR / Recruiter</option>
            </select>
          </div>
          {role === "hr" && (
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
              />
            </div>
          )}
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
            Create account
          </button>
        </form>

        {message && (
          <p style={{ fontSize: "13px", color: message.includes("success") ? "var(--success)" : "var(--danger)", marginTop: "16px" }}>
            {message}
          </p>
        )}

        <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "24px", textAlign: "center" }}>
          Already have an account? <a href="/login" style={{ color: "var(--accent)", fontWeight: 500 }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}