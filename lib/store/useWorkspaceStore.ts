import { create } from "zustand";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type Connection,
} from "@xyflow/react";
import { type BugDNAAnalysis, type ExecutionFrame } from "@/lib/ai/gemini";
import type { CodebaseGraph, CodebaseSummary } from "@/lib/ai/codebase";
import { pickEntryFile, type ProjectFile } from "@/lib/utils/codebase";

export interface CodeModule {
  id?: string;
  nodeId: string;
  filename: string;
  code: string;
  language: string;
}

export interface BugDNAStats {
  totalAnalyzed: number;
  cognitiveScore: number;
  traps: Record<string, number>;
}

export type IngestStatus = "idle" | "reading" | "analyzing" | "done" | "error";

export interface WorkspaceState {
  // Mode
  isGuestMode: boolean;
  setIsGuestMode: (val: boolean) => void;

  // Project Info
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  lastActiveProjectId: string | null;
  setProjectInfo: (id: string, title: string, description: string) => void;
  setLastActiveProjectId: (id: string | null) => void;

  // Architecture Canvas (React Flow)
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isGeneratingArchitecture: boolean;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;
  setIsGeneratingArchitecture: (val: boolean) => void;

  // Code Workspace (Monaco)
  codeModules: Record<string, CodeModule>;
  activeCode: string;
  activeFileName: string;
  activeLanguage: string;
  setActiveCode: (code: string) => void;
  setActiveFile: (filename: string, code: string, language?: string) => void;
  updateCodeModule: (nodeId: string, module: Partial<CodeModule>) => void;

  // Multi-file Codebase Ingestion
  projectFiles: Record<string, ProjectFile>;
  activeFilePath: string | null;
  ingestStatus: IngestStatus;
  ingestMessage: string;
  codebaseSummary: CodebaseSummary | null;
  graphVersion: number;
  setIngestStatus: (status: IngestStatus, message?: string) => void;
  setProjectFiles: (files: ProjectFile[]) => void;
  openFile: (path: string) => void;
  removeFile: (path: string) => void;
  removeFolder: (prefix: string) => void;
  applyCodebaseGraph: (graph: CodebaseGraph) => void;

  // Micro Execution Step Visualizer
  executionFrames: ExecutionFrame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // in ms
  isVisualizingExecution: boolean;
  executionError: string | null;
  setExecutionFrames: (frames: ExecutionFrame[]) => void;
  setCurrentFrameIndex: (index: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  resetExecution: () => void;
  setIsPlaying: (val: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsVisualizingExecution: (val: boolean) => void;
  setExecutionError: (err: string | null) => void;

  // BugDNA Engine
  bugDnaLogs: BugDNAAnalysis[];
  bugDnaStats: BugDNAStats;
  isAnalyzingBug: boolean;
  activeBugReport: BugDNAAnalysis | null;
  addBugDnaLog: (analysis: BugDNAAnalysis) => void;
  setIsAnalyzingBug: (val: boolean) => void;
  setActiveBugReport: (analysis: BugDNAAnalysis | null) => void;
  setBugDnaData: (logs: BugDNAAnalysis[], stats: BugDNAStats) => void;

  // Project Loaders
  loadDemoWorkspace: () => void;
  loadUserProjectWorkspace: (
    project: { id: string; title: string; description?: string; architecture_graph?: any },
    codeModules?: Record<string, CodeModule>,
    userBugLogs?: BugDNAAnalysis[],
    userBugStats?: BugDNAStats
  ) => void;

  // Web Preview
  previewOpen: boolean;
  setPreviewOpen: (val: boolean) => void;
  previewSrcDoc: string;
  setPreviewSrcDoc: (html: string) => void;
}

const DEFAULT_DEMO_CODE = `/**
 * Two Sum: Find two numbers that add up to target
 * @param {number[]} nums - Sorted array of integers
 * @param {number} target - Sum to match
 */
function twoSum(nums: number[], target: number): number[] {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];

    if (sum === target) {
      return [left, right]; // Match found
    } else if (sum < target) {
      left++; // Need a larger sum
    } else {
      right--; // Need a smaller sum
    }
  }

  return [-1, -1];
}

// Execute with sample array
twoSum([2, 7, 11, 15], 9);
`;

const INITIAL_DEMO_NODES: Node[] = [
  {
    id: "node-gateway",
    position: { x: 100, y: 180 },
    type: "systemNode",
    data: {
      id: "node-gateway",
      label: "API Gateway",
      category: "gateway",
      description: "Reverse proxy, rate limiting, and route dispatching",
      tech: "Envoy / Next.js",
      status: "healthy",
      ports: ["http:80", "https:443"],
      metrics: { rps: 1850, latency: "8ms", cpu: "21%" },
      fileName: "gateway.ts",
      codeSnippet: `// API Gateway route dispatcher\nexport async function handleRequest(req: Request) {\n  const token = req.headers.get("Authorization");\n  if (!token) return new Response("Unauthorized", { status: 401 });\n  return forwardToService(req);\n}`,
    },
  },
  {
    id: "node-auth",
    position: { x: 420, y: 80 },
    type: "systemNode",
    data: {
      id: "node-auth",
      label: "Auth Service",
      category: "auth",
      description: "Google OAuth 2.0 & Supabase JWT verification",
      tech: "Supabase Auth / Go",
      status: "healthy",
      ports: ["http:8081"],
      metrics: { rps: 640, latency: "14ms", cpu: "15%" },
      fileName: "auth.ts",
      codeSnippet: `// Verify incoming Bearer token\nexport async function verifySession(token: string) {\n  return supabase.auth.getUser(token);\n}`,
    },
  },
  {
    id: "node-core",
    position: { x: 420, y: 280 },
    type: "systemNode",
    data: {
      id: "node-core",
      label: "Core Compute Engine",
      category: "service",
      description: "Business logic and step-by-step execution coordinator",
      tech: "Node.js / TypeScript",
      status: "active",
      ports: ["http:8082"],
      metrics: { rps: 1420, latency: "24ms", cpu: "44%" },
      fileName: "coreEngine.ts",
      codeSnippet: `// Core logic processor\nexport async function executeStepMachine(code: string) {\n  return parseAlgorithmicExecution(code);\n}`,
    },
  },
  {
    id: "node-db",
    position: { x: 740, y: 80 },
    type: "systemNode",
    data: {
      id: "node-db",
      label: "PostgreSQL Database",
      category: "database",
      description: "Persists projects, code modules, and BugDNA profiles",
      tech: "PostgreSQL 16 with RLS",
      status: "healthy",
      ports: ["tcp:5432"],
      metrics: { rps: 2100, latency: "5ms", cpu: "32%" },
      fileName: "schema.sql",
      codeSnippet: `SELECT id, title, architecture_graph FROM projects WHERE user_id = auth.uid();`,
    },
  },
  {
    id: "node-cache",
    position: { x: 740, y: 280 },
    type: "systemNode",
    data: {
      id: "node-cache",
      label: "Redis Cache",
      category: "cache",
      description: "Sub-millisecond state caching & real-time sessions",
      tech: "Redis Cluster",
      status: "healthy",
      ports: ["tcp:6379"],
      metrics: { rps: 5800, latency: "1.2ms", cpu: "19%" },
      fileName: "cache.ts",
      codeSnippet: `await redis.set(\`cache:\${key}\`, JSON.stringify(val), "EX", 300);`,
    },
  },
];

const INITIAL_DEMO_EDGES: Edge[] = [
  { id: "e1", source: "node-gateway", target: "node-auth", label: "Auth Guard", animated: true },
  { id: "e2", source: "node-gateway", target: "node-core", label: "Dispatch", animated: true },
  { id: "e3", source: "node-core", target: "node-db", label: "Persist", animated: false },
  { id: "e4", source: "node-core", target: "node-cache", label: "Fast Cache", animated: true },
];

const DEMO_BUG_LOGS: BugDNAAnalysis[] = [
  {
    error_type: "Off-by-One Array Boundary Violation",
    cognitive_pattern: "Off-by-One Boundary Oversights",
    mental_model_flaw: "Confusing length N with highest zero-indexed pointer N-1, leading to dereferencing undefined in iteration loops.",
    cognitive_bias: "Inclusive Boundary Illusion",
    preventative_heuristic: "Enforce strict index bounding: last valid index in array of length N is strictly N-1. Use '<' instead of '<='.",
    snippet: `for (let i = 0; i <= arr.length; i++) {\n  console.log(arr[i].value); // throws TypeError\n}`,
    resolution: `for (let i = 0; i < arr.length; i++) {\n  console.log(arr[i].value);\n}`,
    detailed_explanation: "This pattern accounts for 35% of your recent algorithmic boundary bugs. It stems from switching between human 1-based ordinal counting and 0-based memory offsets.",
    category: "Bounds & Pointers",
    severity: "Medium",
    frequencyRisk: 78,
  },
  {
    error_type: "State Desynchronization Race",
    cognitive_pattern: "Unhandled Async State Race Conditions",
    mental_model_flaw: "Assuming async network calls resolve in request order without token cancellation or AbortController guards.",
    cognitive_bias: "Linearity Heuristic Bias",
    preventative_heuristic: "Always check active session token or attach an AbortSignal to async fetch transitions.",
    snippet: `async function search(q) {\n  const res = await api(q);\n  setResults(res); // May overwrite newer query\n}`,
    resolution: `useEffect(() => {\n  const controller = new AbortController();\n  api(q, { signal: controller.signal }).then(setResults);\n  return () => controller.abort();\n}, [q]);`,
    detailed_explanation: "When typing quickly in search or switching tabs, older slow network packets finish after newer ones, corrupting client state.",
    category: "Async & Race Conditions",
    severity: "High",
    frequencyRisk: 65,
  },
];

const DEMO_BUG_STATS: BugDNAStats = {
  totalAnalyzed: 14,
  cognitiveScore: 820,
  traps: {
    "Off-by-One Boundary Oversights": 35,
    "Unhandled Async State Race Conditions": 28,
    "Mutation of Shared State Reference": 18,
    "Implicit Type Coercion Blindspot": 12,
    "Premature Optimization Fallacy": 7,
  },
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  isGuestMode: true,
  setIsGuestMode: (val) => set({ isGuestMode: val }),

  projectId: "sandbox-demo-1",
  projectTitle: "Unified Architecture & Algorithm Sandbox",
  projectDescription: "High-performance distributed engineering workspace powered by Gemini 2.5",
  lastActiveProjectId: null,
  setProjectInfo: (id, title, description) => set({ projectId: id, projectTitle: title, projectDescription: description }),
  setLastActiveProjectId: (id) => set({ lastActiveProjectId: id }),

  // Multi-file codebase ingestion state
  projectFiles: {},
  activeFilePath: null,
  ingestStatus: "idle",
  ingestMessage: "",
  codebaseSummary: null,
  graphVersion: 0,

  setIngestStatus: (status, message = "") => set({ ingestStatus: status, ingestMessage: message }),

  setProjectFiles: (files) => {
    const map: Record<string, ProjectFile> = {};
    files.forEach((f) => (map[f.path] = f));
    set({
      projectFiles: map,
      activeFilePath: null,
      codeModules: {},
      nodes: [],
      edges: [],
      selectedNodeId: null,
      codebaseSummary: null,
      executionFrames: [],
      currentFrameIndex: 0,
      executionError: null,
    });
    const entry = pickEntryFile(files.map((f) => f.path));
    if (entry) get().openFile(entry);
  },

  openFile: (path) => {
    const file = get().projectFiles[path];
    if (!file) return;
    const node = get().nodes.find((n) => (n.data as any)?.filePath === path);
    set({
      activeFilePath: path,
      activeFileName: path.split("/").pop() || path,
      activeCode: file.content,
      activeLanguage: file.language,
      selectedNodeId: node ? node.id : null,
      executionFrames: [],
      currentFrameIndex: 0,
      executionError: null,
    });
  },

  applyCodebaseGraph: (graph) => {
    const files = get().projectFiles;
    const modules: Record<string, CodeModule> = {};
    graph.nodes.forEach((n) => {
      const f = files[n.data.filePath];
      if (f) modules[n.id] = { nodeId: n.id, filename: f.path, code: f.content, language: f.language };
    });
    const edges: Edge[] = graph.edges.map((e) => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#22d3ee" },
      style: { stroke: "#22d3ee88", strokeWidth: 1.5 },
      labelStyle: { fill: "#e4e4e7", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "#18181b" },
      labelBgPadding: [4, 2] as [number, number],
    }));
    set({
      nodes: graph.nodes as unknown as Node[],
      edges,
      codeModules: modules,
      codebaseSummary: graph.summary,
      graphVersion: get().graphVersion + 1,
      selectedNodeId: null,
    });
    const activePath = get().activeFilePath;
    const match = graph.nodes.find((n) => n.data.filePath === activePath) ?? graph.nodes[0];
    if (match) get().setSelectedNodeId(match.id);
  },

  removeFile: (path) => {
    const { projectFiles, activeFilePath, codeModules, nodes, selectedNodeId } = get();
    const updated = { ...projectFiles };
    delete updated[path];
    const patch: Partial<WorkspaceState> = { projectFiles: updated };

    // If the deleted file is currently open, clear the editor
    if (activeFilePath === path) {
      const remaining = Object.keys(updated);
      if (remaining.length > 0) {
        const first = remaining[0];
        patch.activeFilePath = first;
        patch.activeCode = updated[first].content;
        patch.activeFileName = first.split("/").pop() || first;
        patch.activeLanguage = updated[first].language;
      } else {
        patch.activeFilePath = null;
        patch.activeCode = "";
        patch.activeFileName = "index.ts";
        patch.activeLanguage = "typescript";
      }
    }

    // Remove orphaned codeModules for nodes mapped to this file
    const updatedModules = { ...codeModules };
    Object.entries(updatedModules).forEach(([nodeId, mod]) => {
      if ((mod as any).filename === path) delete updatedModules[nodeId];
    });
    patch.codeModules = updatedModules;

    // Deselect if the selected node's file was deleted
    if (selectedNodeId) {
      const selNode = nodes.find((n) => n.id === selectedNodeId);
      if (selNode && (selNode.data as any)?.filePath === path) {
        patch.selectedNodeId = null;
      }
    }

    set(patch);
  },

  removeFolder: (prefix) => {
    const { projectFiles } = get();
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const toRemove = Object.keys(projectFiles).filter(
      (p) => p === prefix || p.startsWith(normalizedPrefix)
    );
    // Re-use removeFile logic for each
    const store = get();
    // Remove all matching files at once for efficiency
    const updated = { ...projectFiles };
    toRemove.forEach((p) => delete updated[p]);

    const { activeFilePath, codeModules, nodes, selectedNodeId } = store;
    const patch: Partial<WorkspaceState> = { projectFiles: updated };

    if (activeFilePath && toRemove.includes(activeFilePath)) {
      const remaining = Object.keys(updated);
      if (remaining.length > 0) {
        const first = remaining[0];
        patch.activeFilePath = first;
        patch.activeCode = updated[first].content;
        patch.activeFileName = first.split("/").pop() || first;
        patch.activeLanguage = updated[first].language;
      } else {
        patch.activeFilePath = null;
        patch.activeCode = "";
        patch.activeFileName = "index.ts";
        patch.activeLanguage = "typescript";
      }
    }

    const updatedModules = { ...codeModules };
    Object.entries(updatedModules).forEach(([nodeId, mod]) => {
      if (toRemove.includes((mod as any).filename || "")) delete updatedModules[nodeId];
    });
    patch.codeModules = updatedModules;

    if (selectedNodeId) {
      const selNode = nodes.find((n) => n.id === selectedNodeId);
      if (selNode && toRemove.includes((selNode.data as any)?.filePath || "")) {
        patch.selectedNodeId = null;
      }
    }

    set(patch);
  },

  // Architecture Canvas (React Flow)
  nodes: INITIAL_DEMO_NODES,
  edges: INITIAL_DEMO_EDGES,
  selectedNodeId: "node-core",
  isGeneratingArchitecture: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection: Connection) => set({ edges: addEdge(connection, get().edges) }),
  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
    if (!id) return;
    const node = get().nodes.find((n) => n.id === id);
    if (!node || !node.data) return;
    const data = node.data as any;

    // Canvas -> Monaco sync for ingested files
    if (data.filePath && get().projectFiles[data.filePath]) {
      get().openFile(data.filePath);
      return;
    }

    const code = data.codeSnippet || `// Implementation for ${data.label}\n// Tech: ${data.tech}\n`;
    const filename = data.fileName || `${data.id}.ts`;
    get().setActiveFile(filename, code, "typescript");
  },
  setIsGeneratingArchitecture: (val) => set({ isGeneratingArchitecture: val }),

  // Code Workspace (Monaco)
  codeModules: {
    "node-core": {
      nodeId: "node-core",
      filename: "algorithm.ts",
      code: DEFAULT_DEMO_CODE,
      language: "typescript",
    },
  },
  activeCode: DEFAULT_DEMO_CODE,
  activeFileName: "algorithm.ts",
  activeLanguage: "typescript",
  setActiveCode: (code) => {
    const { activeFilePath, projectFiles, selectedNodeId, codeModules, activeFileName, activeLanguage } = get();
    const patch: Partial<WorkspaceState> = { activeCode: code };

    if (activeFilePath && projectFiles[activeFilePath]) {
      patch.projectFiles = {
        ...projectFiles,
        [activeFilePath]: { ...projectFiles[activeFilePath], content: code, size: code.length },
      };
    }
    if (selectedNodeId) {
      patch.codeModules = {
        ...codeModules,
        [selectedNodeId]: {
          nodeId: selectedNodeId,
          filename: activeFilePath ?? activeFileName,
          code,
          language: activeLanguage,
        },
      };
    }
    set(patch);
  },
  setActiveFile: (filename, code, language = "typescript") => {
    set({ activeFileName: filename, activeCode: code, activeLanguage: language, activeFilePath: null });
  },
  updateCodeModule: (nodeId, moduleUpdate) => {
    const modules = { ...get().codeModules };
    const current = modules[nodeId] || {
      nodeId,
      filename: `${nodeId}.ts`,
      code: "",
      language: "typescript",
    };
    modules[nodeId] = { ...current, ...moduleUpdate };
    set({ codeModules: modules });
    if (get().selectedNodeId === nodeId) {
      set({
        activeCode: modules[nodeId].code,
        activeFileName: modules[nodeId].filename,
        activeLanguage: modules[nodeId].language,
      });
    }
  },

  // Execution visualizer
  executionFrames: [],
  currentFrameIndex: 0,
  isPlaying: false,
  playbackSpeed: 900,
  isVisualizingExecution: false,
  executionError: null,
  setExecutionFrames: (frames) => set({ executionFrames: frames, currentFrameIndex: 0, executionError: null }),
  setCurrentFrameIndex: (index) => {
    const frames = get().executionFrames;
    if (frames.length > 0 && index >= 0 && index < frames.length) {
      set({ currentFrameIndex: index });
    }
  },
  stepForward: () => {
    const { currentFrameIndex, executionFrames } = get();
    if (currentFrameIndex < executionFrames.length - 1) {
      set({ currentFrameIndex: currentFrameIndex + 1 });
    } else {
      set({ isPlaying: false });
    }
  },
  stepBackward: () => {
    const { currentFrameIndex } = get();
    if (currentFrameIndex > 0) {
      set({ currentFrameIndex: currentFrameIndex - 1 });
    }
  },
  resetExecution: () => set({ currentFrameIndex: 0, isPlaying: false }),
  setIsPlaying: (val) => set({ isPlaying: val }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsVisualizingExecution: (val) => set({ isVisualizingExecution: val }),
  setExecutionError: (err) => set({ executionError: err }),

  // BugDNA
  bugDnaLogs: DEMO_BUG_LOGS,
  bugDnaStats: DEMO_BUG_STATS,
  isAnalyzingBug: false,
  activeBugReport: null,
  addBugDnaLog: (analysis) => {
    const logs = [analysis, ...get().bugDnaLogs];
    const stats = { ...get().bugDnaStats };
    stats.totalAnalyzed += 1;
    stats.traps[analysis.cognitive_pattern] = (stats.traps[analysis.cognitive_pattern] || 0) + 1;
    set({ bugDnaLogs: logs, bugDnaStats: stats, activeBugReport: analysis });
  },
  setIsAnalyzingBug: (val) => set({ isAnalyzingBug: val }),
  setActiveBugReport: (analysis) => set({ activeBugReport: analysis }),
  setBugDnaData: (logs, stats) => set({ bugDnaLogs: logs, bugDnaStats: stats }),

  // Web Preview
  previewOpen: false,
  setPreviewOpen: (val) => set({ previewOpen: val }),
  previewSrcDoc: "",
  setPreviewSrcDoc: (html) => set({ previewSrcDoc: html }),

  // Loaders
  loadDemoWorkspace: () => {
    set({
      isGuestMode: true,
      projectId: "sandbox-demo-1",
      projectTitle: "Unified Architecture & Algorithm Sandbox",
      projectDescription: "High-performance distributed engineering workspace powered by Gemini 2.5",
      nodes: INITIAL_DEMO_NODES,
      edges: INITIAL_DEMO_EDGES,
      selectedNodeId: "node-core",
      codeModules: {
        "node-core": {
          nodeId: "node-core",
          filename: "algorithm.ts",
          code: DEFAULT_DEMO_CODE,
          language: "typescript",
        },
      },
      activeCode: DEFAULT_DEMO_CODE,
      activeFileName: "algorithm.ts",
      activeLanguage: "typescript",
      projectFiles: {},
      activeFilePath: null,
      codebaseSummary: null,
      ingestStatus: "idle",
      ingestMessage: "",
      executionFrames: [],
      currentFrameIndex: 0,
      executionError: null,
      bugDnaLogs: DEMO_BUG_LOGS,
      bugDnaStats: DEMO_BUG_STATS,
    });
  },

  loadUserProjectWorkspace: (project, codeModules = {}, userBugLogs = [], userBugStats) => {
    const graphNodes = project.architecture_graph?.nodes || [];
    const graphEdges = project.architecture_graph?.edges || [];
    const firstNodeId = graphNodes.length > 0 ? graphNodes[0].id : null;

    // Rebuild the explorer from persisted node-mapped files
    const restoredFiles: Record<string, ProjectFile> = {};
    graphNodes.forEach((n: any) => {
      const fp = n?.data?.filePath;
      const mod = codeModules[n.id];
      if (fp && mod) {
        restoredFiles[fp] = { path: fp, content: mod.code, language: mod.language, size: mod.code.length };
      }
    });
    const firstPath: string | null = firstNodeId ? graphNodes[0]?.data?.filePath ?? null : null;
    const restoredActive = firstPath && restoredFiles[firstPath] ? firstPath : null;

    let initialCode = "// Paste or write your code here, or click 'Upload File' above to import.\n";
    let initialFileName = "index.ts";
    let initialLang = "typescript";

    if (restoredActive && restoredFiles[restoredActive]) {
      initialCode = restoredFiles[restoredActive].content;
      initialFileName = restoredActive.split("/").pop() || restoredActive;
      initialLang = restoredFiles[restoredActive].language;
    } else if (firstNodeId && codeModules[firstNodeId]) {
      initialCode = codeModules[firstNodeId].code;
      initialFileName = codeModules[firstNodeId].filename;
      initialLang = codeModules[firstNodeId].language;
    } else if (firstNodeId && graphNodes[0]?.data?.codeSnippet) {
      initialCode = graphNodes[0].data.codeSnippet;
      initialFileName = graphNodes[0].data.fileName || `${firstNodeId}.ts`;
    }

    // Compute stats from logs if not provided
    const trapsMap: Record<string, number> = {};
    userBugLogs.forEach((l) => {
      trapsMap[l.cognitive_pattern] = (trapsMap[l.cognitive_pattern] || 0) + 1;
    });

    const computedStats: BugDNAStats = userBugStats || {
      totalAnalyzed: userBugLogs.length,
      cognitiveScore: Math.max(600, 1000 - userBugLogs.length * 20),
      traps: trapsMap,
    };

    if (typeof window !== "undefined" && project.id && !project.id.startsWith("sandbox-demo")) {
      try {
        localStorage.setItem("devcore_last_project_id", project.id);
      } catch (e) {
        // ignore localStorage errors
      }
    }

    set({
      isGuestMode: false,
      projectId: project.id,
      lastActiveProjectId: project.id,
      projectTitle: project.title,
      projectDescription: project.description || "",
      nodes: graphNodes,
      edges: graphEdges,
      selectedNodeId: firstNodeId,
      codeModules: codeModules,
      projectFiles: restoredFiles,
      activeFilePath: restoredActive,
      codebaseSummary: null,
      ingestStatus: "idle",
      ingestMessage: "",
      activeCode: initialCode,
      activeFileName: initialFileName,
      activeLanguage: initialLang,
      executionFrames: [],
      currentFrameIndex: 0,
      executionError: null,
      bugDnaLogs: userBugLogs,
      bugDnaStats: computedStats,
      activeBugReport: userBugLogs.length > 0 ? userBugLogs[0] : null,
    });
  },
}));
