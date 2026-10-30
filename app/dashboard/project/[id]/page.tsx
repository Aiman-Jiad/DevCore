"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArchitectureCanvas } from "./components/ArchitectureCanvas";
import { MonacoCodeWorkspace } from "./components/MonacoCodeWorkspace";
import { StepVisualizer } from "./components/StepVisualizer";
import { BugDNAPanel } from "./components/BugDNAPanel";
import { WebPreview } from "./components/WebPreview";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { getProjectWorkspaceAction, saveProjectAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Cpu,
  Dna,
  Save,
  Check,
  Columns,
  Code2,
  ChevronDown,
  Sparkles,
  Layers,
  ArrowRight,
  Maximize2,
  Loader2,
  AlertCircle,
  Monitor,
} from "lucide-react";

export default function UnifiedWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id as string) || "sandbox-demo-1";

  const [activeTab, setActiveTab] = useState<"split" | "architecture" | "micro" | "bugdna" | "web">("split");
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const projectTitle = useWorkspaceStore((s) => s.projectTitle);
  const projectDescription = useWorkspaceStore((s) => s.projectDescription);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const codeModules = useWorkspaceStore((s) => s.codeModules);
  const isGuestMode = useWorkspaceStore((s) => s.isGuestMode);
  const loadDemoWorkspace = useWorkspaceStore((s) => s.loadDemoWorkspace);
  const loadUserProjectWorkspace = useWorkspaceStore((s) => s.loadUserProjectWorkspace);

  // Load project on mount
  useEffect(() => {
    async function initWorkspace() {
      try {
        setIsLoadingProject(true);

        // Fetch project or check if redirect is needed for authenticated users on demo ID
        const result = await getProjectWorkspaceAction(projectId);

        if (result && (result as any).redirectProjectId) {
          router.replace(`/dashboard/project/${(result as any).redirectProjectId}`);
          return;
        }

        if (result && result.found && result.project) {
          loadUserProjectWorkspace(
            result.project,
            result.codeModules || {},
            result.bugDnaLogs || [],
            result.bugDnaStats || undefined
          );
        } else if (result && result.isGuest) {
          loadDemoWorkspace();
        } else {
          // If project not found for authenticated user, redirect to workspace router
          router.replace("/dashboard/workspace");
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
        loadDemoWorkspace();
      } finally {
        setIsLoadingProject(false);
      }
    }

    initWorkspace();
  }, [projectId, router, loadDemoWorkspace, loadUserProjectWorkspace]);

  const handleSaveProject = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      const res = await saveProjectAction({
        id: projectId,
        title: projectTitle,
        description: projectDescription,
        architectureGraph: { nodes, edges },
        codeModules,
      });

      if (res.success) {
        setSavedSuccess(true);
        setSaveMessage("Saved to Supabase DB");
        setTimeout(() => {
          setSavedSuccess(false);
          setSaveMessage(null);
        }, 2500);
      } else {
        setSaveMessage(res.message || "Saved in memory");
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
      setSaveMessage("Save error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 font-mono text-xs text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          <span>Synchronizing workspace state from Supabase...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 overflow-hidden">
      {/* Workspace Sub-Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 backdrop-blur-md">
        {/* Project Breadcrumb & Title */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-zinc-100 font-mono tracking-tight flex items-center gap-1.5">
              {projectTitle}
              <Badge
                variant={projectId.startsWith("sandbox-demo") || isGuestMode ? "outline" : "emerald"}
                className="text-[9px] py-0 px-1.5 font-mono text-zinc-300"
              >
                {projectId.startsWith("sandbox-demo") || isGuestMode
                  ? "Presentation Sandbox"
                  : "Supabase Cloud"}
              </Badge>
            </h1>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("split")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              activeTab === "split"
                ? "bg-zinc-800 text-cyan-400 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Columns className="h-3 w-3" />
            <span className="hidden sm:inline">Split Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab("architecture")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              activeTab === "architecture"
                ? "bg-zinc-800 text-cyan-400 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Boxes className="h-3 w-3" />
            <span>Architecture (Macro)</span>
          </button>

          <button
            onClick={() => setActiveTab("micro")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              activeTab === "micro"
                ? "bg-zinc-800 text-cyan-400 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>Visualizer (Micro)</span>
          </button>

          <button
            onClick={() => setActiveTab("bugdna")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all ${
              activeTab === "bugdna"
                ? "bg-zinc-800 text-violet-400 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Dna className="h-3 w-3" />
            <span>BugDNA Hub</span>
          </button>
        </div>

        {/* Save Graph Button */}
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline animate-pulse">
              {saveMessage}
            </span>
          )}

          <Button
            onClick={handleSaveProject}
            disabled={isSaving}
            variant={savedSuccess ? "emerald" : "outline"}
            size="sm"
            className="h-8 text-xs font-mono gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Saved</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 text-zinc-400" />
                <span>Save Graph</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Tab 1: Unified Split View */}
        {activeTab === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 h-full w-full overflow-hidden">
            {/* Left / Top: React Flow Architecture Sandbox (6 cols) */}
            <div className="lg:col-span-6 h-full border-r border-zinc-800/80 flex flex-col relative">
              <ArchitectureCanvas />
            </div>

            {/* Right / Bottom: Monaco Code Workspace & Step Visualizer */}
            <div className="lg:col-span-6 h-full flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 overflow-hidden">
              <div className="h-1/2 lg:h-full lg:w-7/12 flex flex-col">
                <MonacoCodeWorkspace />
              </div>
              <div className="h-1/2 lg:h-full lg:w-5/12 flex flex-col">
                <StepVisualizer />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Architecture Canvas */}
        {activeTab === "architecture" && (
          <div className="h-full w-full">
            <ArchitectureCanvas />
          </div>
        )}

        {/* Tab 3: Algorithmic Visualizer & Code Workspace */}
        {activeTab === "micro" && (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full divide-x divide-zinc-800">
            <MonacoCodeWorkspace />
            <StepVisualizer />
          </div>
        )}

        {/* Tab 4: BugDNA Engine Hub */}
        {activeTab === "bugdna" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 h-full w-full divide-x divide-zinc-800">
            <div className="lg:col-span-5 h-full">
              <MonacoCodeWorkspace />
            </div>
            <div className="lg:col-span-7 h-full">
              <BugDNAPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
