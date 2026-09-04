"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role ? { name: "", email: "", role: payload.role } : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => {
        if (profile) setUser(profile);
      })
      .catch(() => undefined);
  }, []);

  function signOut() {
    localStorage.removeItem("access_token");
    setUser(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
          {user ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--bg)" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent)", color: "white", fontSize: "12px", fontWeight: 700 }}>
                  {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>{user.name || "Signed in"}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-soft)", textTransform: "capitalize" }}>{user.role}</p>
                </div>
              </div>
              <Link href={user.role === "hr" ? "/hr-jobs" : "/my-applications"} style={{ fontSize: "14px", color: "white", background: "var(--accent)", padding: "8px 16px", borderRadius: "8px", fontWeight: 500, textDecoration: "none" }}>
                {user.role === "hr" ? "Dashboard" : "My applications"}
              </Link>
              <button onClick={signOut} style={{ fontSize: "14px", color: "var(--ink-soft)", background: "transparent", border: "none", padding: "8px 0", cursor: "pointer" }}>
                Sign out
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "560px",
            textAlign: "center",
          }}
        >
          <p
            className="font-display"
            style={{
              fontSize: "44px",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: "0 0 16px",
            }}
          >
            Hiring, judged by fit — not by luck.
          </p>

          <p
            style={{
              fontSize: "16px",
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              margin: "0 0 32px",
            }}
          >
            Talenta screens every resume against the role with AI, so
            recruiters spend their time on people, not paperwork.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <Link
              href="/jobs"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "white",
                background: "var(--accent)",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Browse open roles
            </Link>

            <a
              href="/register"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--ink)",
                background: "white",
                border: "1px solid var(--border)",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Post a job
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}