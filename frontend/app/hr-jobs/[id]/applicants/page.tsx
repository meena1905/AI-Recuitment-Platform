"use client";
import { API_URL } from "@/lib/api";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function ApplicantsPage() {
  const params = useParams();
  const jobId = params.id;
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function loadApplicants() {
    const token = localStorage.getItem("access_token");
    fetch(`${API_URL}/jobs/${jobId}/applicants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
        setApplicants(sorted);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  async function updateStatus(applicationId: number, newStatus: string) {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`http://localhost:8000/applications/${applicationId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (response.ok) {
      loadApplicants();
    } else {
      const data = await response.json();
      alert(data.detail || "Failed to update status");
    }
  }

  const nextActions: Record<string, { label: string; status: string; danger?: boolean }[]> = {
    applied: [
      { label: "Shortlist", status: "shortlisted" },
      { label: "Reject", status: "rejected", danger: true },
    ],
    shortlisted: [{ label: "Reject", status: "rejected", danger: true }],
    interview_scheduled: [
      { label: "Hire", status: "hired" },
      { label: "Reject", status: "rejected", danger: true },
    ],
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return { background: "#F0F1F5", color: "var(--ink-soft)" };
    if (score >= 70) return { background: "var(--success-bg)", color: "var(--success)" };
    if (score >= 40) return { background: "var(--warning-bg)", color: "var(--warning)" };
    return { background: "var(--danger-bg)", color: "var(--danger)" };
  };

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
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <a href="/hr-jobs" style={{ fontSize: "13px", color: "var(--ink-soft)", textDecoration: "none" }}>
          ← Back to jobs
        </a>
        <p className="font-display" style={{ fontSize: "28px", fontWeight: 600, margin: "12px 0 4px" }}>
          Applicants
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", margin: "0 0 28px" }}>
          Ranked by AI match score
        </p>

        {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}
        {!loading && applicants.length === 0 && (
          <p style={{ color: "var(--ink-soft)", padding: "24px 0" }}>No applicants yet.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {applicants.map((app) => (
            <div
              key={app.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Candidate #{app.candidate_id}</p>
                  <span style={{ ...statusStyle(app.status), fontSize: "11px", fontWeight: 600, padding: "2px 9px", borderRadius: "20px" }}>
                    {app.status.replace("_", " ")}
                  </span>
                </div>
                <span
                  style={{
                    ...scoreColor(app.match_score),
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    flexShrink: 0,
                  }}
                >
                  {app.match_score !== null ? `${app.match_score}% match` : "Scoring…"}
                </span>
              </div>

              {app.ai_explanation && (
                <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  {app.ai_explanation}
                </p>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                {(nextActions[app.status] || []).map((action) => (
                  <button
                    key={action.status}
                    onClick={() => updateStatus(app.id, action.status)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: action.danger ? "1px solid var(--danger)" : "none",
                      background: action.danger ? "white" : "var(--ink)",
                      color: action.danger ? "var(--danger)" : "white",
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}