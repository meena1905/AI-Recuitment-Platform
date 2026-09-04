"use client";
import { API_URL } from "@/lib/api";
import { useState, useEffect } from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import UserCard from "@/app/UserCard";

export default function JobsPage() {
  const [jobs, setJobs] = useState<{ id: number; title: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const loggedIn = useSyncExternalStore(
    () => () => undefined,
    () => Boolean(localStorage.getItem("access_token")),
    () => false,
  );

  useEffect(() => {
    fetch(`${API_URL}/jobs/public`)
      .then((res) => res.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch jobs:", error);
        setJobs([]);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          className="font-display"
          style={{
            fontSize: "20px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Talenta
        </p>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <UserCard />
          {!loggedIn && <>
          <a
            href="/login"
            style={{
              fontSize: "14px",
              color: "var(--ink-soft)",
              padding: "8px 14px",
              textDecoration: "none",
            }}
          >
            Sign in
          </a>

          <a
            href="/register"
            style={{
              fontSize: "14px",
              color: "white",
              background: "var(--accent)",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Get started
          </a>
          </>}
        </div>
      </header>

      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "56px 24px",
        }}
      >
        <p
          className="font-display"
          style={{
            fontSize: "36px",
            fontWeight: 600,
            margin: "0 0 8px",
          }}
        >
          Open roles
        </p>

        <p
          style={{
            color: "var(--ink-soft)",
            fontSize: "15px",
            margin: "0 0 40px",
          }}
        >
          {jobs.length} position{jobs.length !== 1 ? "s" : ""} currently
          accepting applications
        </p>

        {loading && (
          <p style={{ color: "var(--ink-soft)" }}>
            Loading jobs…
          </p>
        )}

        {!loading && jobs.length === 0 && (
          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              color: "var(--ink-soft)",
            }}
          >
            <p style={{ fontSize: "15px" }}>
              No open roles right now — check back soon.
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              style={{
                display: "block",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "22px 24px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <p
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  margin: "0 0 6px",
                }}
              >
                {job.title}
              </p>

              <p
                style={{
                  fontSize: "14px",
                  color: "var(--ink-soft)",
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {job.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}