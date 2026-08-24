"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function ApplicantsPage() {
  const params = useParams();
  const jobId = params.id;
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function loadApplicants() {
    const token = localStorage.getItem("access_token");
    fetch(`http://localhost:8000/jobs/${jobId}/applicants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      loadApplicants();
    } else {
      const data = await response.json();
      alert(data.detail || "Failed to update status");
    }
  }

  const nextActions: Record<string, { label: string; status: string }[]> = {
    applied: [
      { label: "Shortlist", status: "shortlisted" },
      { label: "Reject", status: "rejected" },
    ],
    shortlisted: [
      { label: "Reject", status: "rejected" },
    ],
    interview_scheduled: [
      { label: "Hire", status: "hired" },
      { label: "Reject", status: "rejected" },
    ],
  };

  if (loading) return <p>Loading applicants...</p>;

  return (
    <div style={{ maxWidth: "700px", margin: "50px auto" }}>
      <h1>Applicants</h1>
      {applicants.length === 0 && <p>No applicants yet.</p>}
      {applicants.map((app) => (
        <div key={app.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px" }}>
          <h3>Candidate #{app.candidate_id}</h3>
          {app.match_score !== null ? (
            <>
              <p><strong>Match Score:</strong> {app.match_score}%</p>
              <p><strong>AI Analysis:</strong> {app.ai_explanation}</p>
            </>
          ) : (
            <p><em>Scoring in progress...</em></p>
          )}
          <p><strong>Status:</strong> {app.status.replace("_", " ")}</p>

          {(nextActions[app.status] || []).map((action) => (
            <button
              key={action.status}
              onClick={() => updateStatus(app.id, action.status)}
              style={{ marginRight: "10px" }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}