"use client";

import { useState, useEffect } from "react";

export default function HRJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [message, setMessage] = useState("");

  function loadJobs() {
    const token = localStorage.getItem("access_token");
    fetch("http://localhost:8000/jobs/mine", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setJobs(data));
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
      body: JSON.stringify({ title, description, requirements }),
    });

    if (response.ok) {
      setMessage("Job created as draft.");
      setTitle("");
      setDescription("");
      setRequirements("");
      loadJobs();
    } else {
      const data = await response.json();
      setMessage(data.detail || "Failed to create job.");
    }
  }

  async function togglePublish(job: any) {
    const token = localStorage.getItem("access_token");
    const newStatus = job.status === "published" ? "draft" : "published";

    await fetch(`http://localhost:8000/jobs/${job.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    loadJobs();
  }

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto" }}>
      <h1>My Job Postings</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: "30px" }}>
        <h3>Create New Job</h3>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <br />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <br />
        <textarea
          placeholder="Requirements"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          required
        />
        <br />
        <button type="submit">Create Job</button>
        <p>{message}</p>
      </form>

      <h3>Your Jobs</h3>
      {jobs.map((job) => (
        <div key={job.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px" }}>
          <h4>{job.title} — {job.status}</h4>
          <p>{job.description}</p>
          <button onClick={() => togglePublish(job)}>
            {job.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      ))}
    </div>
  );
}