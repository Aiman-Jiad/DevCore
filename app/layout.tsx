import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "DevCore AI - Unified Engineering Hub",
  description:
    "AI-powered unified engineering hub: visual system architecture sandbox, interactive algorithmic visualizer, and BugDNA cognitive profiling engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        <Navbar />
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
