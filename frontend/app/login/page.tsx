"use client";
import { useState } from "react";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("access_token", data.access_token);
      setMessage("Logged in successfully!");
    } else {
      setMessage(data.detail || "Login failed.");
    }
  }
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
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
        <button type="submit">Login</button>
      </form>
      <p>{message}</p>
    </div>
  );
}