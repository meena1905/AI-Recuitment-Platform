"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/jobs/public")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((j: any) => j.id === Number(params.id));
        setJob(found);
      });
  }, [params.id]);

  if (!job) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto" }}>
      <h1>{job.title}</h1>
      <p>{job.description}</p>
      <h3>Requirements</h3>
      <p>{job.requirements}</p>
    </div>
  );
}