"use client";
// ↑ This component uses useState and onClick — both need to run in the
// browser, not the server. Without this line, Next.js would try to render
// this as a server component and error out the moment it hits useState.

import { useState } from "react";

export default function RegisterPage() {
  // Each of these is a separate piece of "memory" for this component.
  // name starts as "", setName is the only way to change it.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // ↑ Stops the browser's default "reload the whole page" behavior
    // when a form submits — we want to handle it with JavaScript instead.

    const response = await fetch("http://localhost:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    // ↑ Sends the same kind of request Swagger's "Execute" button sends.
    // `await` pauses this function here until the server actually responds.

    if (response.ok) {
      setMessage("Registered successfully! You can now log in.");
      // ↑ Calling setMessage triggers React to re-render this component,
      // which is why the <p>{message}</p> below will update on screen.
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
          // ↑ "Controlled input": this box's visible text is literally
          // driven by the `name` variable. Every keystroke calls setName,
          // which updates `name`, which re-renders the input with the new value.
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