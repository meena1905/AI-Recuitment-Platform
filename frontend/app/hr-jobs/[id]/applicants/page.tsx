"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
export default function ApplicantsPage() {
  const params = useParams();
  const jobId = params.id;
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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
  }, [jobId]);
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
          <p><strong>Status:</strong> {app.status}</p>
        </div>
      ))}
    </div>
  );
}