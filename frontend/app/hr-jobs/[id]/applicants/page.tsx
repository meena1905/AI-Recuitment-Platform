"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestedFollowups?: string[];
}

interface ComparisonResult {
  executive_verdict: string;
  candidate_a: {
    name: string;
    score: number;
    key_strengths: string[];
    potential_risks: string[];
    ideal_for: string;
  };
  candidate_b: {
    name: string;
    score: number;
    key_strengths: string[];
    potential_risks: string[];
    ideal_for: string;
  };
  dimension_comparison: {
    dimension: string;
    candidate_a_eval: string;
    candidate_b_eval: string;
    leader: string;
  }[];
  final_recommendation: string;
}

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

  // RAG Assistant State
  const [activeAssistantApp, setActiveAssistantApp] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

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
      .catch(() => setError("Unable to load applicants. Verify that the backend server is reachable."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  useEffect(() => {
    if (activeAssistantApp) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

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
      alert("Please select one or more PDF or DOCX resume files.");
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
        alert(data.detail || "Bulk upload failed.");
        return;
      }
      alert(`${data.created_count} resume(s) uploaded successfully. Background scoring in progress.`);
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
      const data = await response.json().catch(() => ({}));
      alert(data.detail || "Failed to update application status.");
    }
  }

  async function submitInterviewSlots(applicationId: number) {
    const slots = scheduledSlots.filter(Boolean);
    if (slots.length === 0) {
      alert("Please select at least one date and time slot.");
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
      const data = await response.json().catch(() => ({}));
      alert(data.detail || "Failed to submit interview slots.");
    }
  }

  async function viewResume(applicationId: number) {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_URL}/applications/${applicationId}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.detail || "Unable to retrieve resume file.");
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
      alert(data.detail || "Unable to rescore application.");
      return;
    }
    loadApplicants();
  }

  // Open RAG Assistant
  function openAssistant(app: any) {
    setActiveAssistantApp(app);
    setChatMessages([
      {
        role: "assistant",
        content: `I have analyzed the full resume for **${app.candidate_name || `Candidate #${app.id}`}** against this job's requirements. You can ask specific questions about their background, project depth, or alignment with your tech stack.`,
        suggestedFollowups: [
          "Summarize top strengths and risk factors",
          "Generate 3 role-specific technical interview questions",
          "Evaluate hands-on project depth and scale",
          "Verify experience with core job requirements",
        ],
      },
    ]);
  }

  async function handleSendQuestion(questionText: string) {
    const query = questionText.trim();
    if (!query || !activeAssistantApp) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: query }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const historyPayload = newMessages.map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_URL}/applications/${activeAssistantApp.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: query,
          history: historyPayload.slice(0, -1),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer || "No response generated.",
            suggestedFollowups: data.suggested_followups || [],
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.detail || "Error generating answer from the assistant.",
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error: Unable to communicate with the AI assistant service.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // Candidate Comparison
  function toggleCompareSelection(id: number) {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], id]);
      } else {
        setSelectedForCompare([...selectedForCompare, id]);
      }
    }
  }

  async function runCandidateComparison() {
    if (selectedForCompare.length !== 2) {
      alert("Please select exactly two candidates to compare.");
      return;
    }
    setComparingLoading(true);
    setComparisonModalOpen(true);
    setComparisonData(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/jobs/${jobId}/compare-candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          application_ids: selectedForCompare,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setComparisonData(data);
      } else {
        alert(data.detail || "Failed to generate comparison analysis.");
        setComparisonModalOpen(false);
      }
    } catch {
      alert("Network error while generating candidate comparison.");
      setComparisonModalOpen(false);
    } finally {
      setComparingLoading(false);
    }
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

  // KPI Calculations
  const totalApplicants = applicants.length;
  const scoredApplicants = applicants.filter((a) => a.match_score !== null);
  const avgScore = scoredApplicants.length
    ? Math.round(scoredApplicants.reduce((acc, cur) => acc + (cur.match_score || 0), 0) / scoredApplicants.length)
    : null;
  const shortlistedCount = applicants.filter((a) => ["shortlisted", "interview_scheduled", "hired"].includes(a.status)).length;
  const topCandidate = applicants.reduce((prev, current) => ((prev?.match_score || 0) > (current?.match_score || 0) ? prev : current), null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 48px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        
        {/* Navigation & Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <a href="/hr-jobs" style={{ fontSize: "13px", color: "var(--ink-soft)", textDecoration: "none", fontWeight: 500 }}>
              &larr; Back to job postings
            </a>
            <h1 className="font-display" style={{ fontSize: "28px", fontWeight: 600, margin: "8px 0 2px" }}>
              Applicant Intelligence
            </h1>
            <p style={{ color: "var(--ink-soft)", fontSize: "14px", margin: 0 }}>
              AI-evaluated candidate ranking, resume Q&amp;A, and comparative talent analysis.
            </p>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Applicants</p>
            <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: 700, color: "var(--ink)" }}>{totalApplicants}</p>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Average Match Score</p>
            <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: 700, color: "var(--ink)" }}>{avgScore !== null ? `${avgScore}%` : "—"}</p>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>In Pipeline</p>
            <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: 700, color: "var(--accent)" }}>{shortlistedCount}</p>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Top Match</p>
            <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: 600, color: "var(--success)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topCandidate?.candidate_name ? `${topCandidate.match_score}% — ${topCandidate.candidate_name.split(" ")[0]}` : "—"}
            </p>
          </div>
        </div>

        {/* Selection / Compare Bar */}
        {selectedForCompare.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ink)", color: "white", padding: "12px 20px", borderRadius: "10px", marginBottom: "20px", boxShadow: "0 4px 16px rgba(18,32,61,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                {selectedForCompare.length} of 2 candidates selected for comparison
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {selectedForCompare.length === 2 ? (
                <button onClick={runCandidateComparison} style={{ padding: "7px 16px", background: "var(--accent)", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Compare Selected Candidates
                </button>
              ) : (
                <span style={{ fontSize: "12px", color: "#B4C2DC", alignSelf: "center" }}>Select 1 more candidate</span>
              )}
              <button onClick={() => setSelectedForCompare([])} style={{ padding: "7px 12px", background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "7px", fontSize: "12px", cursor: "pointer" }}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Import Box */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", padding: "16px", marginBottom: "22px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: 600 }}>Batch Resume Ingestion</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)" }}>Upload PDF or DOCX files for automated parsing and scoring.</p>
          </div>
          <input type="file" multiple accept=".pdf,.docx" onChange={(event) => setBulkFiles(event.target.files)} style={{ maxWidth: "230px", fontSize: "12px" }} />
          <button onClick={uploadBulkResumes} disabled={uploadingBulk} style={{ padding: "8px 16px", background: "var(--accent)", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: uploadingBulk ? "wait" : "pointer", opacity: uploadingBulk ? 0.65 : 1 }}>
            {uploadingBulk ? "Processing..." : "Import Resumes"}
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "22px" }}>
          <input type="number" min="0" max="100" placeholder="Min score" value={minScore} onChange={(event) => setMinScore(event.target.value)} style={{ width: "105px", padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px" }} />
          <input placeholder="Search name or skill" value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} style={{ width: "180px", padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px" }} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px" }}>
            <option value="">All statuses</option>
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview scheduled</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} style={{ padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px" }}>
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

        {loading && <p style={{ color: "var(--ink-soft)", padding: "20px 0" }}>Loading candidate records...</p>}
        {!loading && error && <p style={{ color: "var(--danger)", padding: "20px 0" }}>{error}</p>}
        {!loading && applicants.length === 0 && (
          <p style={{ color: "var(--ink-soft)", padding: "24px 0" }}>No applicants recorded for this position.</p>
        )}

        {/* Applicant Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {applicants.map((app) => {
            const isSelected = selectedForCompare.includes(app.id);

            return (
              <div
                key={app.id}
                style={{
                  background: "var(--surface)",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "20px 24px",
                  boxShadow: isSelected ? "0 4px 14px rgba(36,81,184,0.08)" : "none",
                  transition: "all 0.15s ease-in-out",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCompareSelection(app.id)}
                      title="Select to compare"
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent)" }}
                    />
                    <div>
                      <p style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{app.candidate_name || `Candidate #${app.candidate_id}`}</p>
                      <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "2px 0 0" }}>{app.candidate_email || "Email pending extraction"}</p>
                    </div>
                    <span style={{ ...statusStyle(app.status), fontSize: "11px", fontWeight: 600, padding: "2px 9px", borderRadius: "20px", textTransform: "capitalize" }}>
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
                    {app.match_score !== null ? `${app.match_score}% Match` : "Scoring in progress"}
                  </span>
                </div>

                {/* Score Breakdown Pills */}
                {(app.skills_score !== null || app.experience_score !== null || app.education_score !== null) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                    {app.skills_score !== null && <span style={{ padding: "4px 9px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px", color: "var(--ink-soft)" }}>Skills: <strong>{app.skills_score}%</strong></span>}
                    {app.experience_score !== null && <span style={{ padding: "4px 9px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px", color: "var(--ink-soft)" }}>Experience: <strong>{app.experience_score}%</strong></span>}
                    {app.education_score !== null && <span style={{ padding: "4px 9px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px", color: "var(--ink-soft)" }}>Education: <strong>{app.education_score}%</strong></span>}
                  </div>
                )}

                {/* Extracted Candidate Details */}
                {(app.phone || app.skills || app.experience || app.education) && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px 18px", padding: "12px 14px", marginBottom: "14px", background: "var(--bg)", borderRadius: "8px", fontSize: "13px" }}>
                    {app.phone && <p style={{ margin: 0 }}><strong>Phone:</strong> {app.phone}</p>}
                    {app.skills && <p style={{ margin: 0 }}><strong>Key Skills:</strong> {JSON.parse(app.skills || "[]").slice(0, 8).join(", ")}</p>}
                    {app.experience && <p style={{ margin: 0 }}><strong>Experience:</strong> {app.experience}</p>}
                    {app.education && <p style={{ margin: 0 }}><strong>Education:</strong> {app.education}</p>}
                  </div>
                )}

                {/* AI Explanation Summary */}
                {app.ai_explanation && (
                  <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
                    {app.ai_explanation}
                  </p>
                )}

                {/* Candidate Action Buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => openAssistant(app)}
                      style={{
                        padding: "7px 14px",
                        color: "white",
                        background: "var(--ink)",
                        border: "none",
                        borderRadius: "7px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      AI Assistant
                    </button>

                    <button
                      onClick={() => viewResume(app.id)}
                      style={{
                        padding: "7px 14px",
                        color: "var(--accent)",
                        background: "white",
                        border: "1px solid var(--border)",
                        borderRadius: "7px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View Resume
                    </button>

                    {(app.interview?.calendar_link || app.calendar_link) && (
                      <a
                        href={app.interview?.calendar_link || app.calendar_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "7px 14px",
                          color: "white",
                          background: "var(--accent)",
                          borderRadius: "7px",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Join Interview
                      </a>
                    )}
                  </div>

                  {/* Status Progression Controls */}
                  {schedulingId === app.id ? (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="datetime-local"
                        value={scheduledSlots[0]}
                        onChange={(e) => setScheduledSlots([e.target.value, ...scheduledSlots.slice(1)])}
                        style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }}
                      />
                      <button
                        onClick={() => submitInterviewSlots(app.id)}
                        style={{ padding: "6px 12px", background: "var(--accent)", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Send Slots
                      </button>
                      <button
                        onClick={() => { setSchedulingId(null); setScheduledSlots([""]); }}
                        style={{ padding: "6px 10px", background: "white", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(nextActions[app.status] || []).map((action) => (
                        <button
                          key={action.label}
                          onClick={() => (action.schedule ? setSchedulingId(app.id) : updateStatus(app.id, action.status!))}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            border: action.danger ? "1px solid var(--danger)" : "1px solid var(--border)",
                            background: action.danger ? "white" : "var(--surface)",
                            color: action.danger ? "var(--danger)" : "var(--ink)",
                            cursor: "pointer",
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RAG AI Candidate Assistant Drawer */}
      {activeAssistantApp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(18,32,61,0.45)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--surface)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(18,32,61,0.2)",
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>AI Candidate Intelligence</p>
                <h2 className="font-display" style={{ margin: "4px 0 2px", fontSize: "20px", fontWeight: 600 }}>{activeAssistantApp.candidate_name || `Candidate #${activeAssistantApp.id}`}</h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-soft)" }}>
                  {activeAssistantApp.match_score !== null ? `${activeAssistantApp.match_score}% Match Score` : "Evaluation Profile"}
                </p>
              </div>
              <button
                onClick={() => setActiveAssistantApp(null)}
                style={{ background: "transparent", border: "none", fontSize: "20px", color: "var(--ink-soft)", cursor: "pointer", padding: "4px" }}
              >
                &times;
              </button>
            </div>

            {/* Chat Timeline */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {chatMessages.map((msg, index) => (
                <div key={index} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%" }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: msg.role === "user" ? "var(--ink)" : "var(--bg)",
                      color: msg.role === "user" ? "white" : "var(--ink)",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Follow-up Prompts */}
                  {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && index === chatMessages.length - 1 && (
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>Suggested Inquiries</p>
                      {msg.suggestedFollowups.map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendQuestion(prompt)}
                          disabled={chatLoading}
                          style={{
                            textAlign: "left",
                            padding: "6px 10px",
                            fontSize: "12px",
                            background: "white",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--accent)",
                            cursor: "pointer",
                            transition: "background 0.1s",
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: "var(--bg)", borderRadius: "10px", fontSize: "13px", color: "var(--ink-soft)" }}>
                  Analyzing resume text...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion(chatInput);
                }}
                style={{ display: "flex", gap: "8px" }}
              >
                <input
                  type="text"
                  placeholder="Ask about specific skills, projects, or experience..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: "10px 18px",
                    background: "var(--accent)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                    opacity: chatLoading || !chatInput.trim() ? 0.6 : 1,
                  }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Comparison Modal */}
      {comparisonModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(18,32,61,0.55)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div
            style={{
              width: "100%",
              maxWidth: "880px",
              maxHeight: "90vh",
              background: "var(--surface)",
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 48px rgba(18,32,61,0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="font-display" style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Comparative Candidate Assessment</h2>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--ink-soft)" }}>Side-by-side qualification matrix and fit analysis.</p>
              </div>
              <button
                onClick={() => setComparisonModalOpen(false)}
                style={{ background: "transparent", border: "none", fontSize: "22px", color: "var(--ink-soft)", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
              {comparingLoading && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-soft)" }}>
                  <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>Evaluating Candidate Resumes...</p>
                  <p style={{ fontSize: "13px", margin: 0 }}>Synthesizing technical requirements and experience depth.</p>
                </div>
              )}

              {!comparingLoading && comparisonData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Executive Verdict Banner */}
                  <div style={{ background: "#F4F7FC", border: "1px solid #D5E0F2", borderRadius: "10px", padding: "16px 20px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Executive Verdict</p>
                    <p style={{ margin: "6px 0 0", fontSize: "14px", color: "var(--ink)", lineHeight: 1.6 }}>{comparisonData.executive_verdict}</p>
                  </div>

                  {/* 2-Column Side-by-Side Snapshot */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {/* Candidate A Card */}
                    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{comparisonData.candidate_a.name}</h3>
                        <span style={{ ...scoreColor(comparisonData.candidate_a.score), fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
                          {comparisonData.candidate_a.score}% Match
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "0 0 10px" }}><strong>Best Suited For:</strong> {comparisonData.candidate_a.ideal_for}</p>

                      <div style={{ marginBottom: "10px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "var(--success)" }}>Key Strengths:</p>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: 1.5 }}>
                          {comparisonData.candidate_a.key_strengths.map((st, sIdx) => (
                            <li key={sIdx}>{st}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "var(--warning)" }}>Identified Gaps / Risks:</p>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: 1.5 }}>
                          {comparisonData.candidate_a.potential_risks.map((rk, rIdx) => (
                            <li key={rIdx}>{rk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Candidate B Card */}
                    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{comparisonData.candidate_b.name}</h3>
                        <span style={{ ...scoreColor(comparisonData.candidate_b.score), fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
                          {comparisonData.candidate_b.score}% Match
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "0 0 10px" }}><strong>Best Suited For:</strong> {comparisonData.candidate_b.ideal_for}</p>

                      <div style={{ marginBottom: "10px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "var(--success)" }}>Key Strengths:</p>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: 1.5 }}>
                          {comparisonData.candidate_b.key_strengths.map((st, sIdx) => (
                            <li key={sIdx}>{st}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "var(--warning)" }}>Identified Gaps / Risks:</p>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", lineHeight: 1.5 }}>
                          {comparisonData.candidate_b.potential_risks.map((rk, rIdx) => (
                            <li key={rIdx}>{rk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Dimension Comparison Table */}
                  {comparisonData.dimension_comparison && comparisonData.dimension_comparison.length > 0 && (
                    <div>
                      <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600 }}>Dimension-by-Dimension Assessment</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "1px solid var(--border)" }}>
                        <thead>
                          <tr style={{ background: "var(--bg)", textAlign: "left" }}>
                            <th style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", width: "25%" }}>Evaluation Dimension</th>
                            <th style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", width: "35%" }}>{comparisonData.candidate_a.name}</th>
                            <th style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", width: "35%" }}>{comparisonData.candidate_b.name}</th>
                            <th style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", width: "15%" }}>Leader</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.dimension_comparison.map((dim, dIdx) => (
                            <tr key={dIdx} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{dim.dimension}</td>
                              <td style={{ padding: "10px 14px", color: "var(--ink-soft)", lineHeight: 1.5 }}>{dim.candidate_a_eval}</td>
                              <td style={{ padding: "10px 14px", color: "var(--ink-soft)", lineHeight: 1.5 }}>{dim.candidate_b_eval}</td>
                              <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--accent)" }}>{dim.leader}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Final Recommendation Card */}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "18px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>Final Recommendation</p>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-soft)", lineHeight: 1.6 }}>{comparisonData.final_recommendation}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setComparisonModalOpen(false)}
                style={{ padding: "8px 18px", background: "var(--ink)", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}