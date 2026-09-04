"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function UserCard() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

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

  if (!user) return null;

  function signOut() {
    localStorage.removeItem("access_token");
    setUser(null);
    router.push("/login");
  }

  const dashboardPath = user.role === "hr" ? "/hr-jobs" : "/my-applications";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
      <button onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface)", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent)", color: "white", fontSize: "12px", fontWeight: 700 }}>
          {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>{user.name}</p>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-soft)", textTransform: "capitalize" }}>{user.role}</p>
        </div>
      </button>
      {menuOpen && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: "170px", padding: "8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(18,32,61,0.12)", zIndex: 10 }}>
          <Link href={dashboardPath} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "9px 10px", color: "var(--ink)", textDecoration: "none", fontSize: "13px", borderRadius: "6px" }}>
            {user.role === "hr" ? "Open HR dashboard" : "Open applications"}
          </Link>
          <button onClick={signOut} style={{ width: "100%", padding: "9px 10px", color: "var(--danger)", background: "transparent", border: "none", textAlign: "left", fontSize: "13px", borderRadius: "6px", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
