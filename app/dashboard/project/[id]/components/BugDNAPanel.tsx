"use client";

import React, { useState } from "react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { runBugDnaAnalysis } from "@/lib/client/codebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dna,
  BrainCircuit,
  AlertOctagon,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";

export function BugDNAPanel() {
  const bugDnaLogs = useWorkspaceStore((s) => s.bugDnaLogs);
  const bugDnaStats = useWorkspaceStore((s) => s.bugDnaStats);
  const activeBugReport = useWorkspaceStore((s) => s.activeBugReport);
  const setActiveBugReport = useWorkspaceStore((s) => s.setActiveBugReport);
  const activeCode = useWorkspaceStore((s) => s.activeCode);
  const executionError = useWorkspaceStore((s) => s.executionError);
  const addBugDnaLog = useWorkspaceStore((s) => s.addBugDnaLog);
  const isAnalyzingBug = useWorkspaceStore((s) => s.isAnalyzingBug);
  const setIsAnalyzingBug = useWorkspaceStore((s) => s.setIsAnalyzingBug);
  const crossFileMode = useWorkspaceStore((s) => Object.keys(s.projectFiles).length > 0);
  const openFile = useWorkspaceStore((s) => s.openFile);

  const [activeTab, setActiveTab] = useState<"overview" | "active" | "history">("overview");

    const handleRunManualAnalysis = async () => {
    const ok = await runBugDnaAnalysis();
    if (ok) setActiveTab("active");
  };

  const selectedReport = activeBugReport || bugDnaLogs[0];

  // Calculate percentages from stats
  const trapEntries = Object.entries(bugDnaStats?.traps || {}).sort((a, b) => b[1] - a[1]);
  const totalWeight = trapEntries.reduce((acc, [_, count]) => acc + count, 0) || 1;

  return (
    <div className="relative flex flex-col h-full w-full bg-zinc-950 overflow-y-auto">
      {/* Panel Header */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-950/80 border border-violet-500/40 text-violet-400">
            <Dna className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-mono">
              BugDNA Engine
              <Badge variant="violet" className="text-[9px] py-0 font-mono">AI + local fallback</Badge>
              {crossFileMode && (
                <Badge variant="outline" className="text-[9px] py-0 font-mono">Cross-file</Badge>
              )}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Code patterns observed in your analyses
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleRunManualAnalysis}
          disabled={isAnalyzingBug}
          size="sm"
          variant="purple"
          className="h-7 px-3 text-xs font-mono font-semibold gap-1.5"
        >
          {isAnalyzingBug ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing Trap...</span>
            </>
          ) : (
            <>
              <BrainCircuit className="h-3.5 w-3.5" />
              <span>Analyze with BugDNA</span>
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800/80 px-4 pt-2 bg-zinc-950">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-violet-400 text-violet-300"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Pattern distribution
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-violet-400 text-violet-300"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Active Flaw Breakdown
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-violet-400 text-violet-300"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Logs ({bugDnaLogs.length})
        </button>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "overview" && (
          <>
            {/* Cognitive Score Hero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-3.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-semibold">
                  Recorded analyses
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-zinc-100">
                    {bugDnaStats?.totalAnalyzed ?? bugDnaLogs.length}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                    {bugDnaLogs.length === 0 ? "No history yet" : "from saved logs"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 leading-tight">
                  Analyses are grouped by technical pattern; no developer score is inferred.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  Total analyzed
                </span>
                <div className="mt-1 text-2xl font-black font-mono text-cyan-400">
                  {bugDnaStats?.totalAnalyzed || bugDnaLogs.length}
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 leading-tight">
                  Saved code reviews in this workspace.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  Most recorded pattern
                </span>
                <div className="mt-1 text-sm font-bold font-mono text-amber-300 truncate">
                  {trapEntries[0]?.[0] || "None Recorded Yet"}
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 leading-tight">
                  {trapEntries[0]
                    ? `${Math.round((trapEntries[0][1] / totalWeight) * 100)}% of saved analyses use this category.`
                    : "No recurring pattern identified so far."}
                </p>
              </div>
            </div>

            {/* Cognitive Trap Distribution Bars */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-violet-400" />
                  Technical Pattern Distribution
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Distribution of saved analyses
                </Badge>
              </div>

              {trapEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs font-mono text-zinc-400">
                  <BrainCircuit className="h-6 w-6 text-violet-400 mx-auto mb-2 opacity-80" />
                  <p>No technical patterns recorded yet.</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Analyze code issues to build a count of technical patterns in saved reports.
                  </p>
                </div>
              ) : (
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
                      <div key={trapName} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-300 font-medium truncate max-w-[280px]">
                            {trapName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-[11px]">{count} occurrences</span>
                            <span className="font-bold text-violet-300 w-10 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* General prevention guidance */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-300 mb-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                Boundary check
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                Reproduce the issue, identify the violated condition, check edge cases, and confirm the fix with a regression test. Pattern labels are suggestions based on the supplied code.
              </p>
            </div>
          </>
        )}

        {activeTab === "active" && selectedReport ? (
          <div className="space-y-4">
            {/* Header Badge */}
            <div className="rounded-xl border border-violet-500/30 bg-zinc-900/60 p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2 mb-3">
                <Badge variant="violet" className="font-mono text-xs">
                  {selectedReport.cognitive_pattern}
                </Badge>
                <Badge variant="destructive" className="font-mono text-[10px]">
                  Severity: {selectedReport.severity || "Medium"}
                </Badge>
              </div>

              {/* Mental Model Flaw */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-violet-400 font-semibold flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Possible technical pattern
                </div>
                <p className="text-sm font-medium text-zinc-100 leading-relaxed">
                  {selectedReport.mental_model_flaw}
                </p>
              </div>
              {(selectedReport as any).cross_file_trace && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Cross-file trace
                  </div>
                  <p className="mt-0.5 text-xs font-mono text-cyan-300 leading-relaxed">
                    {(selectedReport as any).cross_file_trace}
                  </p>
                </div>
              )}
              {Array.isArray((selectedReport as any).involved_files) &&
                (selectedReport as any).involved_files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(selectedReport as any).involved_files.map((p: string) => (
                      <button
                        key={p}
                        onClick={() => openFile(p)}
                        className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-300 hover:border-violet-500/60 hover:text-violet-300"
                        title="Open in editor"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

              {/* Cognitive Bias */}
              {selectedReport.cognitive_bias && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Pattern label:
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
                    {selectedReport.cognitive_bias}
                  </div>
                </div>
              )}

              {/* Preventative Heuristic */}
              <div className="mt-3 rounded-lg bg-zinc-950/80 border border-zinc-800 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Preventative Invariant Heuristic
                </div>
                <p className="text-xs text-zinc-200 mt-1 font-mono leading-relaxed">
                  {selectedReport.preventative_heuristic}
                </p>
              </div>
            </div>

            {/* Code Solution & Rewiring */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="text-xs font-mono font-semibold text-zinc-200 mb-2">
                Architectural Resolution
              </div>
              <pre className="rounded-lg bg-zinc-950 p-3 font-mono text-xs text-emerald-300 overflow-x-auto border border-zinc-800 leading-relaxed">
                {selectedReport.resolution}
              </pre>
            </div>

            {/* Psychological Explanation */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="text-xs font-mono font-semibold text-zinc-300 mb-2">
                  Evidence and technical explanation
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                {selectedReport.detailed_explanation}
              </p>
            </div>
          </div>
        ) : activeTab === "active" ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center font-mono">
            <BrainCircuit className="h-8 w-8 text-violet-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-xs font-bold text-zinc-200">No Active Flaw Report</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Analyze a code issue to receive a tentative technical pattern and a suggested fix. Pattern counts summarize saved analyses; they are not a score or profile of the developer.
            </p>
          </div>
        ) : null}

        {activeTab === "history" && (
          <div className="space-y-2">
            {bugDnaLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center font-mono">
                <Dna className="h-8 w-8 text-violet-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-xs font-bold text-zinc-200">No BugDNA Logs</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  No code issue analyses have been recorded for this workspace yet.
                </p>
              </div>
            ) : (
              bugDnaLogs.map((log, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveBugReport(log);
                    setActiveTab("active");
                  }}
                  className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 hover:border-violet-500/50 hover:bg-zinc-900 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-violet-400 border border-zinc-700">
                      <Dna className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 group-hover:text-violet-300 transition-colors">
                        {log.cognitive_pattern}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[280px]">
                        {log.error_type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[9px] text-zinc-400">
                      {log.category || "Logic"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
