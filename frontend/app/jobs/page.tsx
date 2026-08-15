"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/jobs/public")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading jobs...</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto" }}>
      <h1>Open Jobs</h1>
      {jobs.length === 0 && <p>No jobs available right now.</p>}
      {jobs.map((job) => (
        <div key={job.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px" }}>
          <h3>{job.title}</h3>
          <p>{job.description}</p>
          <Link href={`/jobs/${job.id}`}>View Details</Link>
        </div>
      ))}
    </div>
  );
}