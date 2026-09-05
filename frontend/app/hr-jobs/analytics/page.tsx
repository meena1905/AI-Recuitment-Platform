"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import UserCard from "@/app/UserCard";
import { API_URL } from "@/lib/api";

type FunnelStep = { label: string; count: number; conversion: number };
type Skill = { name: string; count: number };
type DashboardData = {
  jobs: { id: number; title: string }[];
  total_applications: number;
  average_match_score: number | null;
  funnel: FunnelStep[];
  score_distribution: { high: number; medium: number; low: number; unscored: number };
  top_skills: Skill[];
};

const cardStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" };

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedJob, setSelectedJob] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const search = selectedJob ? `?job_id=${selectedJob}` : "";
    fetch(`${API_URL}/analytics/dashboard${search}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Unable to load analytics.");
        return response.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [selectedJob]);

  const scoreBars = data ? [
    { label: "80–100", value: data.score_distribution.high, color: "var(--success)" },
    { label: "60–79", value: data.score_distribution.medium, color: "var(--warning)" },
    { label: "Below 60", value: data.score_distribution.low, color: "var(--danger)" },
    { label: "Unscored", value: data.score_distribution.unscored, color: "var(--ink-soft)" },
  ] : [];
  const scoreMaximum = Math.max(1, ...scoreBars.map((bar) => bar.value));
  const skillMaximum = Math.max(1, ...(data?.top_skills.map((skill) => skill.count) || []));

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <aside style={{ width: "220px", background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "24px 16px", flexShrink: 0 }}>
        <p className="font-display" style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 32px", paddingLeft: "8px" }}>Talenta</p>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <Link href="/hr-jobs" style={{ padding: "9px 12px", borderRadius: "8px", color: "var(--ink-soft)", fontSize: "14px", textDecoration: "none" }}>My Jobs</Link>
          <Link href="/hr-jobs/analytics" style={{ padding: "9px 12px", borderRadius: "8px", background: "var(--bg)", color: "var(--accent)", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>Analytics</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "40px 48px", maxWidth: "1180px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "18px" }}><UserCard /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "20px", marginBottom: "32px" }}>
          <div><h1 className="font-display" style={{ fontSize: "30px", margin: "0 0 6px" }}>Hiring analytics</h1><p style={{ color: "var(--ink-soft)", margin: 0 }}>Track your hiring pipeline and candidate market insights.</p></div>
          <select aria-label="Filter analytics by job" value={selectedJob} onChange={(event) => { setSelectedJob(event.target.value); setLoading(true); }} style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", background: "white", minWidth: "220px" }}>
            <option value="">All jobs</option>
            {data?.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </div>
        {loading && <p style={{ color: "var(--ink-soft)" }}>Loading analytics…</p>}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {data && !loading && <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {[{ label: "Applications", value: data.total_applications }, { label: "Average match score", value: data.average_match_score === null ? "—" : `${data.average_match_score}%` }, { label: "Hire conversion", value: `${data.funnel[3].conversion}%` }].map((card) => <div key={card.label} style={cardStyle}><p style={{ margin: 0, color: "var(--ink-soft)", fontSize: "13px" }}>{card.label}</p><p className="font-display" style={{ margin: "8px 0 0", fontSize: "30px" }}>{card.value}</p></div>)}
          </section>
          <section style={{ ...cardStyle, marginBottom: "24px" }}><h2 className="font-display" style={{ margin: "0 0 4px", fontSize: "21px" }}>Pipeline funnel</h2><p style={{ color: "var(--ink-soft)", margin: "0 0 18px", fontSize: "13px" }}>Conversion is calculated from total applications.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }}>{data.funnel.map((step, index) => <div key={step.label} style={{ textAlign: "center" }}><div style={{ height: `${Math.max(48, 132 - index * 24)}px`, background: index === 3 ? "var(--success)" : "var(--accent)", borderRadius: "9px 9px 3px 3px", display: "flex", flexDirection: "column", justifyContent: "center", color: "white" }}><strong style={{ fontSize: "24px" }}>{step.count}</strong><span style={{ fontSize: "12px" }}>{step.conversion}%</span></div><p style={{ margin: "9px 0 0", fontSize: "13px", fontWeight: 600 }}>{step.label}</p></div>)}</div></section>
          <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "24px" }}>
            <div style={cardStyle}><h2 className="font-display" style={{ margin: "0 0 20px", fontSize: "21px" }}>Score distribution</h2>{scoreBars.map((bar) => <div key={bar.label} style={{ marginBottom: "16px" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}><span>{bar.label}</span><strong>{bar.value}</strong></div><div style={{ height: "10px", borderRadius: "999px", background: "var(--bg)" }}><div style={{ width: `${bar.value / scoreMaximum * 100}%`, height: "100%", borderRadius: "inherit", background: bar.color, transition: "width 200ms ease" }} /></div></div>)}</div>
            <div style={cardStyle}><h2 className="font-display" style={{ margin: "0 0 20px", fontSize: "21px" }}>Top skills in market</h2>{data.top_skills.length === 0 ? <p style={{ color: "var(--ink-soft)", fontSize: "13px" }}>Skills will appear after résumés are scored.</p> : data.top_skills.map((skill) => <div key={skill.name} style={{ marginBottom: "13px" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}><span>{skill.name}</span><strong>{skill.count}</strong></div><div style={{ height: "9px", borderRadius: "999px", background: "var(--bg)" }}><div style={{ width: `${skill.count / skillMaximum * 100}%`, height: "100%", borderRadius: "inherit", background: "var(--accent)", transition: "width 200ms ease" }} /></div></div>)}</div>
          </section>
        </>}
      </main>
    </div>
  );
}
