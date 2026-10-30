"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Cpu,
  Dna,
  Sparkles,
  ArrowRight,
  Terminal,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Layers,
  Code2,
  Workflow,
  Radio,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Background Neon Grid Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 flex flex-col items-center text-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-mono text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] mb-6 animate-pulse">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Gen Production SaaS Powered by Gemini 2.5 Flash & Pro</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-mono leading-none max-w-4xl">
          Unified Engineering Hub
          <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-emerald-300 to-violet-400 bg-clip-text text-transparent">
            From Macro Architecture to Micro Code
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-sm sm:text-base text-zinc-400 font-mono leading-relaxed">
          Design visual distributed microservices with React Flow, step through runtime algorithms line-by-line with Monaco, and eliminate recurring cognitive traps with the BugDNA profiling engine.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard/workspace">
            <Button variant="default" size="lg" className="font-mono text-sm gap-2">
              <Zap className="h-4 w-4 fill-zinc-950" />
              <span>Launch Unified Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="font-mono text-sm gap-2 border-zinc-800 hover:border-cyan-500/40">
              <Boxes className="h-4 w-4 text-cyan-400" />
              <span>Explore Projects & BugDNA</span>
            </Button>
          </Link>
        </div>

        {/* Live Tech Spec Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1">
            <Workflow className="h-3.5 w-3.5 text-cyan-400" />
            <span>React Flow 12</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1">
            <Code2 className="h-3.5 w-3.5 text-blue-400" />
            <span>Monaco Editor</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Gemini 2.5 Flash & Pro</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
            <span>Supabase RLS & Google OAuth</span>
          </div>
        </div>
      </div>

      {/* Three Core Features Grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1: Architecture Sandbox */}
          <div className="rounded-2xl border border-cyan-500/30 bg-zinc-900/40 p-6 backdrop-blur-xl relative group hover:border-cyan-400/60 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-4">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-mono text-base font-bold text-white">
                Architecture Sandbox
              </h3>
              <Badge variant="cyan" className="text-[10px] py-0 font-mono">Macro View</Badge>
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Synthesize scalable distributed system graphs using Gemini 2.5 Flash. Drag, connect, inspect microservices, and click any node to immediately open its code module.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-cyan-400">
              <span>Interactive React Flow Canvas</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature 2: Algorithmic Visualizer */}
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/40 p-6 backdrop-blur-xl relative group hover:border-emerald-400/60 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mb-4">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-mono text-base font-bold text-white">
                Algorithmic Visualizer
              </h3>
              <Badge variant="emerald" className="text-[10px] py-0 font-mono">Micro View</Badge>
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Run TypeScript/JavaScript in Monaco and step through dynamic execution frames. Inspect pointers, array heap allocations, stack variables, and line highlights in real time.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-emerald-400">
              <span>Dynamic State Machine Engine</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature 3: BugDNA Engine */}
          <div className="rounded-2xl border border-violet-500/30 bg-zinc-900/40 p-6 backdrop-blur-xl relative group hover:border-violet-400/60 transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-400 mb-4">
              <Dna className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-mono text-base font-bold text-white">
                BugDNA Engine
              </h3>
              <Badge variant="violet" className="text-[10px] py-0 font-mono">Cognitive Layer</Badge>
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Diagnose the psychological mental model flaws and cognitive biases behind code failures using Gemini 2.5 Pro. Build a personalized radar profile of your top engineering blindspots.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-violet-400">
              <span>Cognitive Trap Profiler</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80 bg-zinc-950/90 py-6 px-4 text-center font-mono text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-between max-w-6xl mx-auto gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-zinc-300">DevCore AI</span>
            <span>- Production Architecture & Algorithmic Hub</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Next.js 15 App Router</span>
            <span>Supabase Auth</span>
            <span>Gemini 2.5 API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
