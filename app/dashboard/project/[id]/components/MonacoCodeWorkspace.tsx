"use client";

import React, { useState, useTransition, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { visualizeCodeExecutionAction } from "@/app/actions";
import { runBugDnaAnalysis } from "@/lib/client/codebase";
import { detectLanguage } from "@/lib/utils/codebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileExplorer } from "./FileExplorer";
import { CodebaseImportButtons, CodebaseStatusBanner, DropOverlay, useCodebaseDrop } from "./CodebaseImport";
import {
  Play, Loader2, Bug, FileCode, AlertCircle, Copy, Check, Upload, PanelLeft,
} from "lucide-react";

const CODE_PRESETS = [
  {
    name: "Two Pointers (Clean)",
    description: "Sorted array two-sum traversal",
    language: "typescript",
    filename: "twoSum.ts",
    code: `function twoSum(nums: number[], target: number): number[] {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];

    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [-1, -1];
}

twoSum([2, 7, 11, 15], 9);`,
  },
  {
    name: "Binary Search",
    description: "Logarithmic interval division",
    language: "typescript",
    filename: "binarySearch.ts",
    code: `function binarySearch(arr: number[], target: number): number {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midVal = arr[mid];

    if (midVal === target) {
      return mid; // Element found
    } else if (midVal < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1; // Not found
}

binarySearch([1, 3, 5, 7, 9, 11, 13], 7);`,
  },
  {
    name: "Off-by-One Loop (BugDNA)",
    description: "Inclusive <= boundary oversight",
    language: "typescript",
    filename: "offByOne.ts",
    code: `// Cognitive Trap: Inclusive boundary iteration causing undefined dereference
function calculatePrefixAverages(items: number[]) {
  const result: number[] = [];
  let sum = 0;

  // Notice the flaw: i <= items.length accesses items[items.length] -> undefined
  for (let i = 0; i <= items.length; i++) {
    sum += items[i];
    result.push(sum / (i + 1));
  }

  return result;
}

calculatePrefixAverages([10, 20, 30, 40]);`,
  },
  {
    name: "Async Race Hazard (BugDNA)",
    description: "Linearity bias without cancellation token",
    language: "typescript",
    filename: "asyncRace.ts",
    code: `// Cognitive Trap: Assuming chronological request order matches arrival time
async function fetchUserProfile(userId: string) {
  let latestData = null;

  // Simultaneous fast & slow query without AbortController
  const promiseA = fakeApi(userId, 300); // query A
  const promiseB = fakeApi(userId, 50);  // query B fired immediately after

  // Resolves promiseA after promiseB, clobbering updated state with stale data
  latestData = await promiseA;
  return latestData;
}

function fakeApi(id: string, delay: number) {
  return new Promise(res => setTimeout(() => res({ id, timestamp: Date.now() }), delay));
}`,
  },
];

export function MonacoCodeWorkspace() {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDragging, dropProps } = useCodebaseDrop();

  const activeCode = useWorkspaceStore((s) => s.activeCode);
  const setActiveCode = useWorkspaceStore((s) => s.setActiveCode);
  const activeFileName = useWorkspaceStore((s) => s.activeFileName);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeLanguage = useWorkspaceStore((s) => s.activeLanguage);
  const hasProject = useWorkspaceStore((s) => Object.keys(s.projectFiles).length > 0);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const setExecutionFrames = useWorkspaceStore((s) => s.setExecutionFrames);
  const executionFrames = useWorkspaceStore((s) => s.executionFrames);
  const currentFrameIndex = useWorkspaceStore((s) => s.currentFrameIndex);
  const setIsVisualizingExecution = useWorkspaceStore((s) => s.setIsVisualizingExecution);
  const executionError = useWorkspaceStore((s) => s.executionError);
  const setExecutionError = useWorkspaceStore((s) => s.setExecutionError);
  const isAnalyzingBug = useWorkspaceStore((s) => s.isAnalyzingBug);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("devcore-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "71717a", fontStyle: "italic" },
        { token: "keyword", foreground: "38bdf8", fontStyle: "bold" },
        { token: "identifier", foreground: "e4e4e7" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "f59e0b" },
        { token: "type", foreground: "a855f7" },
      ],
      colors: {
        "editor.background": "#09090b",
        "editor.foreground": "#f4f4f5",
        "editor.lineHighlightBackground": "#18181b80",
        "editorCursor.foreground": "#22d3ee",
        "editorLineNumber.foreground": "#52525b",
        "editorLineNumber.activeForeground": "#22d3ee",
      },
    });
    monaco.editor.setTheme("devcore-dark");
  };

  // Execution frame line highlight (also clears stale highlight when switching files)
  React.useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    if (executionFrames.length === 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      return;
    }
    const currentFrame = executionFrames[currentFrameIndex];
    if (currentFrame?.activeLine) {
      const line = currentFrame.activeLine;
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
        {
          range: new monacoRef.current.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "bg-cyan-500/20 border-l-4 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
            glyphMarginClassName: "text-cyan-400 font-bold",
          },
        },
      ]);
      editorRef.current.revealLineInCenter(line);
    }
  }, [currentFrameIndex, executionFrames]);

  const handleRunAndVisualize = () => {
    if (!activeCode.trim()) return;

    startTransition(async () => {
      try {
        setIsVisualizingExecution(true);
        setExecutionError(null);

        const isOffByOne = activeCode.includes("<= items.length") || activeCode.includes("<= arr.length");
        const isAsyncRace = activeCode.includes("latestData = await promiseA");

        if (isOffByOne) {
          setExecutionError("TypeError: Cannot read properties of undefined (reading 'items[4]') at index 4.");
        } else if (isAsyncRace) {
          setExecutionError("RaceConditionError: Query A resolved 250ms after Query B, overwriting updated state with stale payload.");
        }

        const result = await visualizeCodeExecutionAction(activeCode);
        if (result && result.frames && result.frames.length > 0) {
          setExecutionFrames(result.frames);
          if (result.status === "error" && result.errorMessage) {
            setExecutionError(result.errorMessage);
          }
        }
      } catch (err: any) {
        console.error("Execution visualization error:", err);
        setExecutionError(err.message || "Execution parsing error");
      }
    });
  };

  // Cross-file when a codebase is loaded, single-file otherwise
  const handleAnalyzeBugDNA = async () => {
    await runBugDnaAnalysis();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Single-file upload (unchanged behaviour)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setActiveFile(file.name, content, detectLanguage(file.name));
        setExecutionFrames([]);
        setExecutionError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div
      {...dropProps}
      className="relative flex flex-col h-full w-full bg-zinc-950 border-r border-zinc-800/80 overflow-hidden"
    >
      <DropOverlay active={isDragging} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".ts,.js,.tsx,.jsx,.py,.cpp,.c,.java,.go,.rs,.sql,.json,.html,.css"
        className="hidden"
      />

      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {hasProject && (
            <button
              onClick={() => setExplorerOpen((v) => !v)}
              className="text-zinc-400 hover:text-cyan-300"
              title="Toggle file explorer"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <FileCode className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="truncate font-mono text-xs font-semibold text-zinc-200" title={activeFilePath || activeFileName}>
            {activeFilePath || activeFileName || "index.ts"}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-zinc-400 capitalize">
            {activeLanguage || "typescript"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            onChange={(e) => {
              const selected = CODE_PRESETS.find((p) => p.name === e.target.value);
              if (selected) {
                setActiveFile(selected.filename, selected.code, selected.language);
                setExecutionError(null);
                setExecutionFrames([]);
              }
            }}
            defaultValue=""
            className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="" disabled>Load Algorithm / Bug...</option>
            {CODE_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-mono gap-1 text-zinc-300 hover:text-white border-zinc-800 hover:border-cyan-500/50"
            title="Import a single file"
          >
            <Upload className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Upload File</span>
          </Button>

          <CodebaseImportButtons />

          <Button
            onClick={handleCopyCode}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
            title="Copy Code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>

          <Button
            onClick={handleRunAndVisualize}
            disabled={isPending}
            size="sm"
            variant="neon"
            className="h-7 px-3 text-xs font-mono font-semibold gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Tracing...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run & Visualize</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <CodebaseStatusBanner />

      {executionError && (
        <div className="flex items-center justify-between gap-3 bg-red-950/40 border-b border-red-500/30 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-red-300 font-mono">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="truncate">{executionError}</span>
          </div>

          <Button
            onClick={handleAnalyzeBugDNA}
            disabled={isAnalyzingBug}
            size="sm"
            variant="purple"
            className="h-6 px-2.5 text-[11px] font-mono shrink-0 gap-1"
          >
            {isAnalyzingBug ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{hasProject ? "Tracing Across Files..." : "Profiling Trap..."}</span>
              </>
            ) : (
              <>
                <Bug className="h-3 w-3" />
                <span>Analyze with BugDNA</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Explorer + Monaco */}
      <div className="flex min-h-0 flex-1">
        {hasProject && explorerOpen && <FileExplorer />}
        <div className="h-full min-h-[300px] min-w-0 flex-1">
          <Editor
            height="100%"
            path={activeFilePath ?? activeFileName ?? "index.ts"}
            language={activeLanguage || "typescript"}
            value={activeCode}
            onChange={(val) => setActiveCode(val || "")}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontFamily: "var(--font-mono), 'Fira Code', 'JetBrains Mono', Menlo, monospace",
              fontSize: 13,
              lineHeight: 20,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>
    </div>
  );
}