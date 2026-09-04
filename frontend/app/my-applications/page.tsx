"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import UserCard from "@/app/UserCard";


export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    fetch(`${API_URL}/applications/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 401 ? "Your session has expired. Please log in again." : "Unable to load applications.");
        }
        return res.json();
      })
      .then((data) => {
        setApplications(Array.isArray(data) ? data : []);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message || "Unable to connect to the server.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function selectInterviewSlot(slotId: number) {
    const token = localStorage.getItem("access_token");
    setSelectingSlot(slotId);
    const response = await fetch(`${API_URL}/interview-slots/${slotId}/select`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.detail || "Unable to select this interview time.");
      setSelectingSlot(null);
      return;
    }
    window.location.reload();
  }

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
      <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
        <span className="font-display" style={{ fontSize: "20px", fontWeight: 600 }}>Talenta</span>
        <UserCard />
      </div>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <p className="font-display" style={{ fontSize: "28px", fontWeight: 600, margin: "0 0 4px" }}>
          My applications
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", margin: "0 0 28px" }}>
          Track the status of every role you've applied to
        </p>

        {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}

        {!loading && error && (
          <p style={{ color: "var(--danger)", fontSize: "14px" }}>{error}</p>
        )}

        {!loading && !error && applications.length === 0 && (
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
                <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>
                  {app.job_title || "Job application"}
                </p>
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
                {app.interview_slots?.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px" }}>
                      Choose an interview time
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {app.interview_slots.map((slot: { id: number; scheduled_at: string }) => (
                        <button
                          key={slot.id}
                          onClick={() => selectInterviewSlot(slot.id)}
                          disabled={selectingSlot !== null}
                          style={{ padding: "8px 12px", background: "white", border: "1px solid var(--accent)", borderRadius: "7px", color: "var(--accent)", fontSize: "13px", fontWeight: 500 }}
                        >
                          {selectingSlot === slot.id ? "Selecting…" : new Date(slot.scheduled_at).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {app.interview?.calendar_link && (
                  <a href={app.interview.calendar_link} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "14px", color: "var(--accent)", fontSize: "13px", fontWeight: 600 }}>
                    Join interview
                  </a>
                )}
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