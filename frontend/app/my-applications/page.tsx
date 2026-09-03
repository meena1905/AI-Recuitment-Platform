"use client";

import { useState, useEffect } from "react";

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch("http://localhost:8000/applications/mine", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setApplications(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const statusStyle = (status: string) => {
    const map: Record<string, any> = {
      applied: { background: "#F0F1F5", color: "var(--ink-soft)" },
      shortlisted: { background: "var(--warning-bg)", color: "var(--warning)" },
      interview_scheduled: { background: "#E5EBFA", color: "var(--accent)" },
      hired: { background: "var(--success-bg)", color: "var(--success)" },
      rejected: { background: "var(--danger-bg)", color: "var(--danger)" },
    };
    return map[status] || { background: "#F0F1F5", color: "var(--ink-soft)" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 48px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <p className="font-display" style={{ fontSize: "28px", fontWeight: 600, margin: "0 0 4px" }}>
          My applications
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", margin: "0 0 28px" }}>
          Track the status of every role you've applied to
        </p>

        {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}

        {!loading && applications.length === 0 && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-soft)" }}>
            <p style={{ fontSize: "15px" }}>You haven't applied to any jobs yet.</p>
            <a href="/jobs" style={{ color: "var(--accent)", fontWeight: 500, fontSize: "14px" }}>
              Browse open roles →
            </a>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {applications.map((app) => (
            <div
              key={app.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "18px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    ...statusStyle(app.status),
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "20px",
                    display: "inline-block",
                    marginBottom: "6px",
                  }}
                >
                  {app.status.replace("_", " ")}
                </span>
                <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: 0 }}>
                  Applied {new Date(app.applied_at).toLocaleDateString()}
                </p>
              </div>
              {app.match_score !== null && (
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                  {app.match_score}% match
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}