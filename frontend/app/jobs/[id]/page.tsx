"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/jobs/public")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const found = list.find((j: any) => j.id === Number(params.id));
        setJob(found || null);
        setLoading(false);
      });
  }, [params.id]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      setMessage("Please sign in as a candidate to apply.");
      return;
    }
    if (!file) {
      setMessage("Please attach your resume (PDF).");
      return;
    }

    setApplying(true);
    const formData = new FormData();
    formData.append("resume", file);

    const response = await fetch(`http://localhost:8000/jobs/${params.id}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    setApplying(false);
    if (response.ok) {
      setMessage("Application submitted! We'll be in touch.");
    } else {
      const data = await response.json();
      setMessage(data.detail || "Could not submit application.");
    }
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px", color: "var(--ink-soft)" }}>Loading…</div>;
  if (!job) return <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px", color: "var(--ink-soft)" }}>Job not found.</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "20px 40px",
        }}
      >
        <a href="/jobs" className="font-display" style={{ fontSize: "20px", fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          Talenta
        </a>
      </header>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "56px 24px" }}>
        <a href="/jobs" style={{ fontSize: "13px", color: "var(--ink-soft)", textDecoration: "none" }}>
          ← Back to all roles
        </a>

        <p className="font-display" style={{ fontSize: "32px", fontWeight: 600, margin: "16px 0 24px" }}>
          {job.title}
        </p>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "28px", marginBottom: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>
            About the role
          </p>
          <p style={{ fontSize: "15px", lineHeight: 1.6, margin: "0 0 20px" }}>{job.description}</p>

          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>
            What we're looking for
          </p>
          <p style={{ fontSize: "15px", lineHeight: 1.6, margin: 0 }}>{job.requirements}</p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "28px" }}>
          <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>Apply for this role</p>
          <form onSubmit={handleApply} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ fontSize: "14px" }}
            />
            <button
              type="submit"
              disabled={applying}
              style={{
                padding: "11px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                opacity: applying ? 0.6 : 1,
              }}
            >
              {applying ? "Submitting…" : "Submit application"}
            </button>
          </form>
          {message && (
            <p style={{ fontSize: "13px", color: message.includes("submitted") ? "var(--success)" : "var(--danger)", marginTop: "12px" }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}