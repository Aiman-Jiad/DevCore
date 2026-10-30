"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { getUserProjectsAction, createProjectAction } from "@/app/actions";
import { collectFromInput } from "@/lib/utils/codebase";
import { ingestRawFiles } from "@/lib/client/codebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Boxes,
  Cpu,
  Dna,
  Plus,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FolderPlus,
  Loader2,
  UserCheck,
  HelpCircle,
  FolderGit2,
  FolderUp,
  Files,
} from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  nodesCount: number;
  updatedAt: string;
}

const DEMO_PROJECTS: ProjectItem[] = [
  {
    id: "sandbox-demo-1",
    title: "DevCore Distributed Core Hub",
    description: "Default high-availability microservices sandbox with Envoy Gateway, Redis, and PostgreSQL.",
    nodesCount: 5,
    updatedAt: "Presentation Demo",
  },
  {
    id: "sandbox-demo-ai",
    title: "Autonomous Agent RAG Pipeline",
    description: "Vector database embeddings store with semantic prompt caching and asynchronous Kafka workers.",
    nodesCount: 6,
    updatedAt: "Presentation Demo",
  },
  {
    id: "sandbox-demo-payment",
    title: "PCI-Compliant Payment Router",
    description: "Idempotent payment webhook processor with dead-letter queue and distributed lock manager.",
    nodesCount: 4,
    updatedAt: "Presentation Demo",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [userBugLogs, setUserBugLogs] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const demoBugStats = useWorkspaceStore((s) => s.bugDnaStats);

  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        let activeUser = null;
        if (isConfigured) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            activeUser = session.user;
          }
        }

        if (activeUser) {
          // ==========================================
          // 1. Authenticated User Mode
          // ==========================================
          setIsAuthenticated(true);
          setUserEmail(activeUser.email || "developer");

          // Fetch ONLY this user's real projects from Supabase
          const { data: dbProjects, error: projError } = await supabase
            .from("projects")
            .select("id, title, description, architecture_graph, updated_at")
            .eq("user_id", activeUser.id)
            .order("updated_at", { ascending: false });

          if (!projError && dbProjects) {
            setProjects(
              dbProjects.map((p) => ({
                id: p.id,
                title: p.title,
                description: p.description || "Custom architecture workspace",
                nodesCount: (p.architecture_graph?.nodes || []).length || 0,
                updatedAt: new Date(p.updated_at).toLocaleDateString(),
              }))
            );
          } else {
            setProjects([]);
          }

          // Fetch user's real BugDNA logs
          const { data: bugLogs } = await supabase
            .from("bug_dna_logs")
            .select("*")
            .eq("user_id", activeUser.id)
            .order("created_at", { ascending: false });

          setUserBugLogs(bugLogs || []);

          // Fetch user profile stats
          const { data: profile } = await supabase
            .from("profiles")
            .select("bug_dna_stats")
            .eq("id", activeUser.id)
            .single();

          setUserStats(profile?.bug_dna_stats || null);
        } else {
          // ==========================================
          // 2. Presentation / Guest Mode
          // ==========================================
          setIsAuthenticated(false);
          setUserEmail(null);
          setProjects(DEMO_PROJECTS);
          setUserBugLogs([]);
          setUserStats(null);
        }
      } catch (err) {
        console.warn("Dashboard loading error:", err);
        setIsAuthenticated(false);
        setProjects(DEMO_PROJECTS);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [isConfigured, supabase]);

  const handleCreateProject = async () => {
    if (!newTitle.trim()) return;

    try {
      setIsCreating(true);
      const res = await createProjectAction({
        title: newTitle.trim(),
        description: newDescription.trim(),
      });

      if (res.success && res.projectId) {
        setIsCreateOpen(false);
        setNewTitle("");
        setNewDescription("");
        router.push(`/dashboard/project/${res.projectId}`);
      } else {
        // Fallback navigation
        const fallbackId = `project-${Date.now()}`;
        router.push(`/dashboard/project/${fallbackId}`);
      }
    } catch (err) {
      console.error("Create project error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCodebaseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = collectFromInput(e.target.files);
    e.target.value = "";
    if (raw.length === 0) return;

    try {
      setIsCreating(true);
      const topDir = raw[0]?.path.split("/")[0];
      const title = newTitle.trim() || (topDir && topDir !== raw[0]?.path ? topDir : "Ingested Codebase");
      const desc = newDescription.trim() || `Auto-ingested ${raw.length} files with connection mapping`;

      const res = await createProjectAction({ title, description: desc });
      const projectId = res.success && res.projectId ? res.projectId : `project-${Date.now()}`;

      // Ingest the files into client store
      await ingestRawFiles(raw);

      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      router.push(`/dashboard/project/${projectId}`);
    } catch (err) {
      console.error("Codebase upload failed:", err);
    } finally {
      setIsCreating(false);
    }
  };

  // Compute dynamic stats depending on mode
  const activeTrapsMap: Record<string, number> = {};
  if (isAuthenticated) {
    if (userStats?.top_traps) {
      Object.entries(userStats.top_traps).forEach(([trap, count]) => {
        if (Number(count) > 0) activeTrapsMap[trap] = Number(count);
      });
    } else if (userBugLogs.length > 0) {
      userBugLogs.forEach((l) => {
        activeTrapsMap[l.cognitive_pattern] = (activeTrapsMap[l.cognitive_pattern] || 0) + 1;
      });
    }
  } else {
    Object.assign(activeTrapsMap, demoBugStats.traps);
  }

  const trapEntries = Object.entries(activeTrapsMap).sort((a, b) => b[1] - a[1]);
  const totalWeight = trapEntries.reduce((acc, [_, count]) => acc + count, 0) || 1;
  const cognitiveScore = isAuthenticated
    ? userStats?.cognitive_score || (userBugLogs.length === 0 ? 1000 : Math.max(650, 1000 - userBugLogs.length * 25))
    : demoBugStats.cognitiveScore;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-8 max-w-7xl mx-auto space-y-8">
      {/* Presentation Mode / Authenticated Banner */}
      {!isAuthenticated ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 text-xs font-mono backdrop-blur-md">
          <div className="flex items-center gap-2 text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              <strong>Presentation / Guest Mode:</strong> Pre-populated with demo microservices, algorithms, and BugDNA radar.
            </span>
          </div>
          <Link href="/">
            <Button variant="neon" size="sm" className="h-7 text-xs font-mono">
              Sign In with Google for Personal Workspaces
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>
              Logged in as <strong>{userEmail}</strong> &bull; Supabase Live Sync Active
            </span>
          </div>
          <Badge variant="emerald" className="font-mono text-[10px]">
            Personal Cloud Storage
          </Badge>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            Engineering Dashboard
            <Badge variant="cyan" className="font-mono text-xs">
              {isAuthenticated ? "User Workspace" : "Demo Sandbox"}
            </Badge>
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-mono">
            {isAuthenticated
              ? "Manage your persistent distributed architectures and personal BugDNA cognitive log."
              : "Explore interactive macro system architectures and review simulated algorithmic execution."}
          </p>
        </div>

        {/* Create Project Modal Trigger */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="gap-2 font-mono text-xs">
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="font-mono text-base text-zinc-100 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-cyan-400" />
                Create New Project
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 font-mono">
                {isAuthenticated
                  ? "Creates a persistent blank workspace in Supabase linked to your developer account."
                  : "Initializes a new interactive canvas in presentation mode."}
              </DialogDescription>
            </DialogHeader>

            {/* Hidden file inputs for codebase ingestion */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is standard in browsers but not yet in React HTML attributes
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={handleCodebaseUpload}
            />
            <input
              ref={filesInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleCodebaseUpload}
            />

            <div className="space-y-4 py-2 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300">Project Title *</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Video Transcoder Pipeline"
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300">Initial Concept / Description (Optional)</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Event-driven Kafka workers with S3 and Auth"
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>

              {/* Or Ingest Codebase Directly */}
              <div className="relative my-2 pt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono">
                  <span className="bg-zinc-950 px-2 text-zinc-400">or import existing codebase</span>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-3.5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <FolderGit2 className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono font-semibold text-zinc-200">
                    Upload Codebase Folder / Multi-File
                  </span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 mb-3">
                  Parses imports across files, connects modules with pipeline arrows in React Flow, and links each node to its source code.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreating}
                    onClick={() => folderInputRef.current?.click()}
                    className="text-xs font-mono gap-1.5 border-zinc-700 hover:border-cyan-500 hover:text-cyan-300"
                  >
                    <FolderUp className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Upload Folder</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreating}
                    onClick={() => filesInputRef.current?.click()}
                    className="text-xs font-mono gap-1.5 border-zinc-700 hover:border-cyan-500 hover:text-cyan-300"
                  >
                    <Files className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Select Multi-File</span>
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateProject}
                disabled={isCreating || !newTitle.trim()}
                className="text-xs font-mono gap-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Workspace</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase text-zinc-400">
              System Graphs
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-white flex items-center justify-between">
              {loading ? "-" : projects.length}
              <Boxes className="h-5 w-5 text-cyan-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] font-mono text-zinc-400">
            {isAuthenticated ? "Stored in your Supabase DB" : "Pre-populated demo systems"}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase text-zinc-400">
              Cognitive Score
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-400 flex items-center justify-between">
              {loading ? "-" : cognitiveScore}
              <BrainCircuit className="h-5 w-5 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            {isAuthenticated && userBugLogs.length === 0 ? "Pristine initial baseline" : "Resilience index rating"}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase text-zinc-400">
              BugDNA Analyzed
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-violet-400 flex items-center justify-between">
              {loading ? "-" : isAuthenticated ? userBugLogs.length : demoBugStats.totalAnalyzed}
              <Dna className="h-5 w-5 text-violet-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] font-mono text-zinc-400">
            {isAuthenticated ? "Recorded personal debug sessions" : "Simulated cognitive patterns"}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase text-zinc-400">
              AI Engines Active
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-cyan-300 flex items-center justify-between">
              2 Models
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] font-mono text-zinc-400">
            gemini-2.5-flash & gemini-2.5-pro
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-mono text-zinc-100 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-cyan-400" />
            {isAuthenticated ? "Your Personal Projects" : "Explore Demo Architectures"}
          </h2>
          <span className="text-xs text-zinc-400 font-mono">
            {isAuthenticated ? "Filtered strictly to your authenticated session" : "Sample pre-configured sandboxes"}
          </span>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex h-48 w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex flex-col items-center gap-2 text-zinc-400 font-mono text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span>Fetching projects from Supabase...</span>
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Clean Empty State for Authenticated Users with 0 Projects */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-cyan-400 mb-4 shadow-xl">
              <FolderPlus className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold font-mono text-white">
              No projects created yet
            </h3>
            <p className="mt-1.5 max-w-md text-xs text-zinc-400 font-mono leading-relaxed">
              You haven&apos;t created any system architecture graphs yet. Start from scratch or describe a concept to have Gemini 2.5 synthesize distributed nodes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => setIsCreateOpen(true)}
                variant="default"
                size="sm"
                className="gap-2 font-mono text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>+ Create Your First Project</span>
              </Button>
              <Link href="/dashboard/project/sandbox-demo-1">
                <Button variant="outline" size="sm" className="font-mono text-xs text-zinc-400">
                  Open Demo Sandbox
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="bg-zinc-900/40 border-zinc-800 hover:border-cyan-500/50 transition-all duration-200 group relative flex flex-col justify-between"
              >
                <CardHeader className="p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="cyan" className="font-mono text-[10px]">
                      {p.nodesCount} Nodes Connected
                    </Badge>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {p.updatedAt}
                    </span>
                  </div>
                  <CardTitle className="text-base font-mono text-zinc-100 mt-2 group-hover:text-cyan-300 transition-colors">
                    {p.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-1 line-clamp-2 font-mono leading-relaxed">
                    {p.description}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="p-5 pt-0 border-t border-zinc-800/60 mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400">
                    React Flow + Monaco
                  </span>
                  <Link href={`/dashboard/project/${p.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 gap-1.5"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* BugDNA Profile Summary Section */}
      <div id="bug-dna" className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-950 border border-violet-500/30 text-violet-400">
              <Dna className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-zinc-100 flex items-center gap-2">
                {isAuthenticated ? "Your BugDNA Cognitive Flaw Profile" : "Presentation BugDNA Radar"}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {isAuthenticated
                  ? "Recurring mental model flaws detected in your code execution sessions"
                  : "Simulated cognitive diagnostic summary"}
              </p>
            </div>
          </div>
          <Badge variant="violet" className="font-mono text-xs">
            Gemini 2.5 Pro Cognitive Engine
          </Badge>
        </div>

        {isAuthenticated && userBugLogs.length === 0 ? (
          /* Empty BugDNA for new authenticated users */
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center font-mono">
            <BrainCircuit className="h-10 w-10 text-violet-400 mx-auto mb-3 opacity-80" />
            <h4 className="text-sm font-bold text-zinc-200">No Cognitive Traps Recorded Yet</h4>
            <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
              When code fails or throws logic violations in your Monaco workspace, click &quot;Analyze with BugDNA&quot; to begin building your personalized psychological developer profile.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trap Distribution Radar/Bar */}
            <div className="lg:col-span-7 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-400" />
                Cognitive Traps Distribution
              </h3>

              <div className="space-y-3.5">
                {trapEntries.map(([trapName, count], idx) => {
                  const percentage = Math.round((count / totalWeight) * 100);
                  const barColor =
                    idx === 0
                      ? "bg-gradient-to-r from-violet-500 to-pink-500"
                      : idx === 1
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                      : idx === 2
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : "bg-gradient-to-r from-amber-500 to-orange-500";

                  return (
                    <div key={trapName} className="space-y-1.5 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-200">{trapName}</span>
                        <span className="font-bold text-violet-300">{percentage}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cognitive Prescriptions */}
            <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-emerald-400" />
                Cognitive Prescriptions
              </h3>

              <div className="space-y-3 text-xs font-mono">
                <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-3">
                  <span className="text-violet-300 font-bold block mb-1">
                    1. Off-by-One Boundary Invariants
                  </span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Avoid evaluating loop conditions using &quot;&lt;=&quot; against array length. Fix by anchoring invariant: length N bounds indices strictly to [0, N-1].
                  </p>
                </div>

                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3">
                  <span className="text-cyan-300 font-bold block mb-1">
                    2. Async Linearity Fallacy
                  </span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Requests sent sequentially do not return sequentially. Always cancel prior queries using an AbortController or check request generation tokens.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
