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
        setApplications(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading your applications...</p>;

  const statusColors: Record<string, string> = {
    applied: "#888",
    shortlisted: "#0070f3",
    interview_scheduled: "#ff9800",
    hired: "#22c55e",
    rejected: "#ef4444",
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto" }}>
      <h1>My Applications</h1>
      {applications.length === 0 && <p>You haven't applied to any jobs yet.</p>}
      {applications.map((app) => (
        <div key={app.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px" }}>
          <p>
            <strong>Status:</strong>{" "}
            <span style={{ color: statusColors[app.status] || "#000" }}>
              {app.status.replace("_", " ")}
            </span>
          </p>
          {app.match_score !== null && (
            <p><strong>Match Score:</strong> {app.match_score}%</p>
          )}
          <p><strong>Applied:</strong> {new Date(app.applied_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}