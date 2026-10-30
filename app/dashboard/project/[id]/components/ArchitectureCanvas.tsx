"use client";

import React, { useState, useTransition, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SystemNode } from "./SystemNode";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { generateArchitectureAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CodebaseImportButtons, DropOverlay, useCodebaseDrop } from "./CodebaseImport";
import {
  Sparkles,
  Loader2,
  Plus,
  RefreshCw,
  Maximize2,
  Workflow,
  Download,
  Terminal,
  Layers,
  Code2,
  FolderGit2,
} from "lucide-react";

const nodeTypes = {
  systemNode: SystemNode,
};

function ArchitectureCanvasInner() {
  const [promptInput, setPromptInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [architectureSummary, setArchitectureSummary] = useState<any>(null);
  const { isDragging, dropProps } = useCodebaseDrop();

  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const codebaseSummary = useWorkspaceStore((s) => s.codebaseSummary);
  const fileCount = Object.keys(projectFiles).length;
  const onNodesChange = useWorkspaceStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const setNodes = useWorkspaceStore((s) => s.setNodes);
  const setEdges = useWorkspaceStore((s) => s.setEdges);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const updateCodeModule = useWorkspaceStore((s) => s.updateCodeModule);

  const { fitView } = useReactFlow();

  const handleGenerateArchitecture = (customPrompt?: string) => {
    const promptToUse = customPrompt || promptInput;
    if (!promptToUse.trim()) return;

    startTransition(async () => {
      try {
        const result = await generateArchitectureAction(promptToUse);
        if (result && result.nodes && result.nodes.length > 0) {
          // Format nodes with custom systemNode type
          const formattedNodes: Node[] = result.nodes.map((n) => ({
            ...n,
            type: "systemNode",
            data: { ...n.data },
          })) as unknown as Node[];

          setNodes(formattedNodes);
          setEdges(result.edges || []);
          setArchitectureSummary(result.summary || null);

          // Populate code modules for each generated node
          result.nodes.forEach((node) => {
            if (node.data?.codeSnippet) {
              updateCodeModule(node.id, {
                nodeId: node.id,
                filename: node.data.fileName || `${node.id}.ts`,
                code: node.data.codeSnippet,
                language: "typescript",
              });
            }
          });

          // Select the first node by default
          if (formattedNodes.length > 0) {
            setSelectedNodeId(formattedNodes[0].id);
          }

          setTimeout(() => {
            fitView({ padding: 0.2, duration: 600 });
          }, 100);
        }
      } catch (err) {
        console.error("Architecture generation failed:", err);
      }
    });
  };

  const handleAddManualNode = () => {
    const newId = `node-manual-${Date.now()}`;
    const newNode = {
      id: newId,
      position: { x: 300 + Math.random() * 80, y: 200 + Math.random() * 80 },
      type: "systemNode",
      data: {
        id: newId,
        label: "New Microservice",
        category: "service" as const,
        description: "Custom service node created manually in canvas",
        tech: "Node.js / Express",
        status: "active" as const,
        ports: ["http:8080"],
        metrics: { rps: 150, latency: "10ms", cpu: "12%" },
        fileName: "service.ts",
        codeSnippet: `// Custom service implementation\nexport async function handleRequest() {\n  return { status: "ok" };\n}`,
      },
    };

    setNodes([...nodes, newNode]);
    setSelectedNodeId(newId);
  };

  const handleExportBlueprint = () => {
    const blueprint = {
      nodes,
      edges,
      summary: architectureSummary,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devcore-architecture-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const activeSummary = codebaseSummary || architectureSummary;

  return (
    <div
      {...dropProps}
      className="relative h-full w-full bg-zinc-950 flex flex-col overflow-hidden"
    >
      <DropOverlay active={isDragging} />
      {/* Top Bar: Prompt Input for Gemini 2.5 Flash Generator */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex flex-1 items-center gap-2 min-w-[320px]">
          <div className="relative flex flex-1 items-center">
            <Sparkles className="absolute left-3 h-4 w-4 text-cyan-400 animate-pulse pointer-events-none" />
            <Input
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerateArchitecture()}
              placeholder="Describe your system concept (e.g. Distributed video transcoder with S3, queue & auth)..."
              className="pl-9 pr-24 font-mono text-xs bg-zinc-900/80 border-zinc-800 focus-visible:ring-cyan-500"
            />
            <Button
              onClick={() => handleGenerateArchitecture()}
              disabled={isPending || !promptInput.trim()}
              size="sm"
              variant="default"
              className="absolute right-1 h-7 px-3 text-xs font-mono font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Workflow className="h-3 w-3 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Architecture Presets */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-zinc-400">Presets:</span>
          <button
            onClick={() => handleGenerateArchitecture("Scalable E-Commerce with Stripe checkout, Redis cart, and PostgreSQL orders")}
            className="rounded px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-cyan-500/40 transition-colors"
          >
            E-Commerce
          </button>
          <button
            onClick={() => handleGenerateArchitecture("Autonomous Multi-Agent AI system with RAG, vector database, and prompt cache")}
            className="rounded px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-cyan-500/40 transition-colors"
          >
            AI Agent Mesh
          </button>
          <button
            onClick={() => handleGenerateArchitecture("Real-time collaborative document engine with WebSockets, CRDTs, and Redis")}
            className="rounded px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-cyan-500/40 transition-colors"
          >
            Real-Time CRDT
          </button>
        </div>

        {/* Actions: Codebase Import, Add Node, Reset view, Export */}
        <div className="flex items-center gap-1.5">
          <CodebaseImportButtons />
          <Button
            onClick={handleAddManualNode}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-mono gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Add Node</span>
          </Button>
          <Button
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs"
            title="Fit to Screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={handleExportBlueprint}
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs"
            title="Export Architecture JSON"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-zinc-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#27272a"
          />
          <Controls
            className="!bg-zinc-900/90 !border-zinc-800 !text-zinc-200 fill-zinc-200"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-zinc-950 !border-zinc-800 rounded-lg overflow-hidden hidden md:block"
            nodeColor={(n) => {
              const cat = (n.data?.category as string) || "service";
              if (cat === "gateway") return "#06b6d4";
              if (cat === "auth") return "#10b981";
              if (cat === "database") return "#8b5cf6";
              if (cat === "cache") return "#f59e0b";
              if (cat === "ai") return "#a855f7";
              return "#3b82f4";
            }}
            maskColor="rgba(9, 9, 11, 0.7)"
          />

          {/* Clean Canvas Empty State Overlay */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/90 p-6 text-center backdrop-blur-md max-w-md shadow-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 mx-auto mb-3">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold font-mono text-zinc-200">
                  Clean Architecture Canvas
                </h4>
                <p className="mt-1 text-[11px] font-mono text-zinc-400 leading-relaxed">
                  Type a system concept in the bar above and click <strong>Generate</strong> to synthesize microservices with Gemini 2.5 Flash, or click <strong>Add Node</strong> to build manually.
                </p>
              </div>
            </Panel>
          )}

          {/* Floating Ingested Codebase Badge */}
          {fileCount > 0 && (
            <Panel position="top-left" className="ml-4 mt-2">
              <div className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-zinc-950/90 px-3.5 py-1.5 backdrop-blur-xl shadow-xl">
                <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono text-zinc-300">
                  Codebase Ingested: <strong className="text-cyan-300">{fileCount} Files</strong> ({nodes.length} Nodes &bull; {edges.length} Pipes)
                </span>
              </div>
            </Panel>
          )}

          {/* Floating System Summary Banner if available */}
          {activeSummary && (
            <Panel position="top-right" className="max-w-sm mr-4 mt-2">
              <div className="rounded-xl border border-cyan-500/30 bg-zinc-950/90 p-3.5 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    <span className="font-semibold text-xs text-zinc-100">
                      {activeSummary.systemName}
                    </span>
                  </div>
                  <Badge variant="cyan" className="text-[10px] py-0 font-mono">
                    Score {activeSummary.scalabilityScore}/100
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-zinc-400 leading-relaxed">
                  {activeSummary.overview}
                </p>
                <div className="mt-2 text-[10px] font-mono text-zinc-400">
                  <span className="text-cyan-400 font-semibold">Security:</span>{" "}
                  {activeSummary.securityNotes}
                </div>
              </div>
            </Panel>
          )}

          {/* Selected Node Drawer / Info Pill */}
          {selectedNode && (
            <Panel position="bottom-center" className="mb-4">
              <div className="flex items-center gap-3 rounded-full border border-cyan-500/40 bg-zinc-950/95 px-4 py-2 backdrop-blur-xl shadow-2xl">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono text-zinc-300">
                  Active Node: <strong className="text-white">{(selectedNode.data as any)?.label}</strong> ({(selectedNode.data as any)?.category})
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5" />
                  {(selectedNode.data as any)?.fileName || "algorithm.ts"}
                </span>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export function ArchitectureCanvas() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvasInner />
    </ReactFlowProvider>
  );
}
