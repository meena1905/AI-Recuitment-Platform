"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";
export default function ApplicantsPage() {
  const params = useParams();
  const jobId = params.id;
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [scheduledSlots, setScheduledSlots] = useState([""]);
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [minScore, setMinScore] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  function loadApplicants() {
    const token = localStorage.getItem("access_token");
    const query = new URLSearchParams({ sort: sortOrder });
    if (minScore) query.set("min_score", minScore);
    if (statusFilter) query.set("status", statusFilter);
    if (skillFilter) query.set("skill", skillFilter);
    fetch(`${API_URL}/jobs/${jobId}/applicants?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setApplicants(list);
      })
      .catch(() => setError("Unable to load applicants. Check that the backend is running."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  function applyFilters() {
    setLoading(true);
    loadApplicants();
  }

  async function exportApplicants() {
    const response = await fetch(`${API_URL}/jobs/${jobId}/applicants/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    });
    if (!response.ok) {
      alert("Unable to export applicants.");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-${jobId}-applicants.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function uploadBulkResumes() {
    if (!bulkFiles?.length) {
      alert("Select one or more PDF or DOCX resumes first.");
      return;
    }
    const formData = new FormData();
    Array.from(bulkFiles).forEach((file) => formData.append("resumes", file));
    setUploadingBulk(true);
    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}/bulk-resumes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || "Bulk upload failed");
        return;
      }
      alert(`${data.created_count} resume(s) uploaded. AI scoring is running in the background.`);
      setBulkFiles(null);
      loadApplicants();
    } finally {
      setUploadingBulk(false);
    }
  }
  async function updateStatus(applicationId: number, newStatus: string) {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_URL}/applications/${applicationId}/status`, {
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

  async function submitInterviewSlots(applicationId: number) {
    const slots = scheduledSlots.filter(Boolean);
    if (slots.length === 0) {
      alert("Please add at least one date and time.");
      return;
    }
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_URL}/applications/${applicationId}/interview-slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scheduled_at: slots }),
    });
    if (response.ok) {
      setSchedulingId(null);
      setScheduledSlots([""]);
      loadApplicants();
    } else {
      const data = await response.json();
      alert(data.detail || "Failed to schedule interview");
    }
  }

  async function viewResume(applicationId: number) {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_URL}/applications/${applicationId}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.detail || "Unable to open resume");
      return;
    }
    const resumeUrl = URL.createObjectURL(await response.blob());
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
  }

  async function rescoreApplication(applicationId: number) {
    const response = await fetch(`${API_URL}/applications/${applicationId}/score`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.detail || "Unable to rescore application");
      return;
    }
    loadApplicants();
  }

  async function createInterviewLink(applicationId: number) {
    const response = await fetch(`${API_URL}/applications/${applicationId}/interview-link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.detail || "Unable to create interview link");
      return;
    }
    loadApplicants();
  }

  const nextActions: Record<string, { label: string; status?: string; danger?: boolean; schedule?: boolean }[]> = {
    applied: [
      { label: "Shortlist", status: "shortlisted" },
      { label: "Reject", status: "rejected", danger: true },
    ],
    shortlisted: [
      { label: "Schedule interview", schedule: true },
      { label: "Reject", status: "rejected", danger: true },
    ],
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

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", padding: "14px", marginBottom: "22px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: 600 }}>Import resumes</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)" }}>Upload multiple PDF or DOCX files for this job.</p>
          </div>
          <input type="file" multiple accept=".pdf,.docx" onChange={(event) => setBulkFiles(event.target.files)} style={{ maxWidth: "230px", fontSize: "12px" }} />
          <button onClick={uploadBulkResumes} disabled={uploadingBulk} style={{ padding: "8px 14px", background: "var(--accent)", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: uploadingBulk ? "wait" : "pointer", opacity: uploadingBulk ? 0.65 : 1 }}>
            {uploadingBulk ? "Uploading…" : "Upload resumes"}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "22px" }}>
          <input type="number" min="0" max="100" placeholder="Min score" value={minScore} onChange={(event) => setMinScore(event.target.value)} style={{ width: "105px", padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px" }} />
          <input placeholder="Search name or skill" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} style={{ width: "180px", padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px" }} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px" }}>
            <option value="">All statuses</option>
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview scheduled</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} style={{ padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px" }}>
            <option value="desc">Highest score</option>
            <option value="asc">Lowest score</option>
          </select>
          <button onClick={applyFilters} style={{ padding: "8px 14px", background: "var(--ink)", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Apply filters
          </button>
          <button onClick={exportApplicants} style={{ padding: "8px 14px", background: "white", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Export CSV
          </button>
        </div>


        {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}
        {!loading && error && <p style={{ color: "var(--danger)" }}>{error}</p>}
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
                  <p style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>{app.candidate_name || `Candidate #${app.candidate_id}`}</p>
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

                {(app.skills_score !== null || app.experience_score !== null || app.education_score !== null) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                    {app.skills_score !== null && <span style={{ padding: "5px 9px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px" }}>Skills {app.skills_score}%</span>}
                    {app.experience_score !== null && <span style={{ padding: "5px 9px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px" }}>Experience {app.experience_score}%</span>}
                    {app.education_score !== null && <span style={{ padding: "5px 9px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px" }}>Education {app.education_score}%</span>}
                  </div>
                )}

              {(app.candidate_email || app.phone || app.skills || app.experience || app.education) && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px 18px", padding: "14px", marginBottom: "14px", background: "var(--bg)", borderRadius: "8px", fontSize: "13px" }}>
                  {app.candidate_email && <p style={{ margin: 0 }}><strong>Email:</strong> {app.candidate_email}</p>}
                  {app.phone && <p style={{ margin: 0 }}><strong>Phone:</strong> {app.phone}</p>}
                  {app.skills && <p style={{ margin: 0 }}><strong>Skills:</strong> {JSON.parse(app.skills || "[]").join(", ")}</p>}
                  {app.experience && <p style={{ margin: 0 }}><strong>Experience:</strong> {app.experience}</p>}
                  {app.education && <p style={{ margin: 0 }}><strong>Education:</strong> {app.education}</p>}
                </div>
              )}

              {app.skills_score === null && app.experience_score === null && app.education_score === null && (
                <button
                  onClick={() => rescoreApplication(app.id)}
                  style={{ marginBottom: "14px", padding: "6px 10px", background: "white", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--accent)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Rescore application
                </button>
              )}

              {app.ai_explanation && (
                <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  {app.ai_explanation}
                </p>
              )}


              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <button
                  onClick={() => viewResume(app.id)}
                  style={{ padding: "7px 14px", color: "var(--accent)", background: "white", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  View resume
                </button>

                {(app.interview?.calendar_link || app.calendar_link) && (
                  <a
                    href={app.interview?.calendar_link || app.calendar_link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "7px 14px", color: "white", background: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "7px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
                  >
                    Join interview
                  </a>
                )}
              </div>

              {schedulingId === app.id ? (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="datetime-local"
                    value={scheduledSlots[0]}
                    onChange={(e) => setScheduledSlots([e.target.value, ...scheduledSlots.slice(1)])}
                    style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px" }}
                  />
                  <button
                    onClick={() => submitInterviewSlots(app.id)}
                    style={{ padding: "7px 14px", background: "var(--accent)", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500 }}
                  >
                    Send options
                  </button>
                  {scheduledSlots.slice(1).map((slot, index) => (
                    <input
                      key={index + 1}
                      type="datetime-local"
                      value={slot}
                      onChange={(e) => setScheduledSlots(scheduledSlots.map((value, slotIndex) => slotIndex === index + 1 ? e.target.value : value))}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px" }}
                    />
                  ))}
                  {scheduledSlots.length < 5 && (
                    <button
                      onClick={() => setScheduledSlots([...scheduledSlots, ""])}
                      style={{ padding: "7px 14px", background: "white", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", fontWeight: 500 }}
                    >
                      Add another time
                    </button>
                  )}
                  <button
                    onClick={() => { setSchedulingId(null); setScheduledSlots([""]); }}
                    style={{ padding: "7px 14px", background: "white", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  {(nextActions[app.status] || []).map((action) => (
                    <button
                      key={action.label}
                      onClick={() => (action.schedule ? setSchedulingId(app.id) : updateStatus(app.id, action.status!))}
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
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}