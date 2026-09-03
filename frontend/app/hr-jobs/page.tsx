"use client";

import { useState, useEffect } from "react";

export default function HRJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  function loadJobs() {
    const token = localStorage.getItem("access_token");

    fetch("http://localhost:8000/jobs/mine", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to load jobs:", error);
        setJobs([]);
      });
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    const response = await fetch("http://localhost:8000/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        requirements,
      }),
    });

    if (response.ok) {
      setMessage("Job created as draft.");
      setTitle("");
      setDescription("");
      setRequirements("");
      setShowForm(false);
      loadJobs();
    } else {
      const data = await response.json();
      setMessage(data.detail || "Failed to create job.");
    }
  }

  async function togglePublish(job: any) {
    const token = localStorage.getItem("access_token");

    const newStatus =
      job.status === "published" ? "draft" : "published";

    const response = await fetch(
      `http://localhost:8000/jobs/${job.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    );

    if (response.ok) {
      loadJobs();
    } else {
      const data = await response.json();
      setMessage(data.detail || "Failed to update job.");
    }
  }

  const statusStyle = (status: string) =>
    status === "published"
      ? {
          background: "var(--success-bg)",
          color: "var(--success)",
        }
      : {
          background: "var(--warning-bg)",
          color: "var(--warning)",
        };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "24px 16px",
          flexShrink: 0,
        }}
      >
        <p
          className="font-display"
          style={{
            fontSize: "18px",
            fontWeight: 600,
            margin: "0 0 32px",
            paddingLeft: "8px",
          }}
        >
          Talenta
        </p>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <a
            href="/hr-jobs"
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              background: "var(--bg)",
              color: "var(--accent)",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            My Jobs
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "40px 48px",
          maxWidth: "820px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "32px",
          }}
        >
          <div>
            <p
              className="font-display"
              style={{
                fontSize: "28px",
                fontWeight: 600,
                margin: "0 0 4px",
              }}
            >
              My job postings
            </p>

            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: "14px",
                margin: 0,
              }}
            >
              {jobs.length} role{jobs.length !== 1 ? "s" : ""} total
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "10px 18px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showForm ? "Cancel" : "+ New job"}
          </button>
        </div>

        {/* Create Job Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "24px",
              marginBottom: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <input
              type="text"
              placeholder="Job title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />

            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />

            <textarea
              placeholder="Requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              required
              rows={2}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />

            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: "var(--ink)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                alignSelf: "flex-start",
                cursor: "pointer",
              }}
            >
              Create job
            </button>
          </form>
        )}

        {/* Message */}
        {message && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-soft)",
              marginBottom: "16px",
            }}
          >
            {message}
          </p>
        )}

        {/* Jobs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {jobs.map((job) => (
            <div
              key={job.id}
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
              {/* Job information */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "4px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {job.title}
                  </p>

                  <span
                    style={{
                      ...statusStyle(job.status),
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "2px 9px",
                      borderRadius: "20px",
                    }}
                  >
                    {job.status}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--ink-soft)",
                    margin: 0,
                  }}
                >
                  {job.description}
                </p>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexShrink: 0,
                  marginLeft: "16px",
                }}
              >
                <button
                  onClick={() => togglePublish(job)}
                  style={{
                    padding: "7px 14px",
                    background: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {job.status === "published"
                    ? "Unpublish"
                    : "Publish"}
                </button>

                <a
                  href={`/hr-jobs/${job.id}/applicants`}
                  style={{
                    padding: "7px 14px",
                    background: "var(--accent)",
                    color: "white",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Applicants
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}