import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pagebrief — AI Webpage Summarizer",
  description: "Turn a public webpage into a short, clear AI summary.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
