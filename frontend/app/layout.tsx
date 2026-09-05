import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talenta — AI Recruitment Platform",
  description: "AI-powered resume screening and hiring pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
