const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "https://ai-recuitment-platform-2.onrender.com");