"use client";
import { useState } from "react";
export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [message, setMessage] = useState("");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("http://localhost:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (response.ok) {
      setMessage("Registered successfully! You can now log in.");
    } else {
      const data = await response.json();
      setMessage(data.detail || "Registration failed.");
    }
  }
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <br />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="candidate">Candidate</option>
          <option value="hr">HR</option>
        </select>
        <br />
        <button type="submit">Register</button>
      </form>
      <p>{message}</p>
    </div>
  );
}