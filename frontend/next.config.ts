import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://ai-recuitment-platform-2.onrender.com"
    : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${backendUrl}/:path*`,
    },
  ],
};

export default nextConfig;