"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Shield,
  Server,
  Database,
  Layers,
  Cpu,
  Globe,
  Radio,
  HardDrive,
  Bot,
  Activity,
  Code2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  gateway: <Radio className="h-4 w-4 text-cyan-400" />,
  auth: <Shield className="h-4 w-4 text-emerald-400" />,
  service: <Server className="h-4 w-4 text-blue-400" />,
  database: <Database className="h-4 w-4 text-violet-400" />,
  cache: <Layers className="h-4 w-4 text-amber-400" />,
  queue: <Cpu className="h-4 w-4 text-pink-400" />,
  storage: <HardDrive className="h-4 w-4 text-indigo-400" />,
  frontend: <Globe className="h-4 w-4 text-emerald-300" />,
  ai: <Bot className="h-4 w-4 text-purple-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  gateway: "border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]",
  auth: "border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  service: "border-blue-500/50 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  database: "border-violet-500/50 hover:border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]",
  cache: "border-amber-500/50 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
  queue: "border-pink-500/50 hover:border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.15)]",
  storage: "border-indigo-500/50 hover:border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
  frontend: "border-teal-500/50 hover:border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]",
  ai: "border-purple-500/50 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
};

export const SystemNode = memo(function SystemNode({ id, data, selected }: NodeProps) {
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const isSelected = selected || selectedNodeId === id;

  const category = (data.category as string) || "service";
  const icon = CATEGORY_ICONS[category] || <Server className="h-4 w-4 text-cyan-400" />;
  const colorStyle = CATEGORY_COLORS[category] || "border-zinc-700";

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`group relative min-w-[240px] max-w-[280px] rounded-xl border bg-zinc-950/90 p-3.5 backdrop-blur-xl transition-all duration-200 cursor-pointer ${colorStyle} ${
        isSelected
          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950 scale-[1.02]"
          : "hover:scale-[1.01]"
      }`}
    >
      {/* React Flow Handles for dynamic edge connectivity */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-zinc-900 !bg-cyan-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-zinc-900 !bg-cyan-400"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-zinc-900 !bg-emerald-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-zinc-900 !bg-emerald-400"
      />

      {/* Header: Icon, Label, and Status */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800">
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-100 tracking-tight leading-snug">
              {(data.label as string) || "Node"}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono capitalize">
              {category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {data.status === "healthy" || data.status === "active" ? (
            <span className="flex items-center gap-1 font-mono text-[9px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Proposed
            </span>
          ) : (
            <span className="flex items-center gap-1 font-mono text-[9px] text-amber-400 bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
              Standby
            </span>
          )}
        </div>
      </div>

      {/* Body: Description */}
      <p className="mt-2 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
        {(data.description as string) || "Distributed microservice module."}
      </p>

      {/* Tech Stack & Code Indicator */}
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-mono">
        <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono text-zinc-300 border-zinc-800 bg-zinc-900/60 truncate max-w-[140px]">
          {(data.tech as string) || "TypeScript"}
        </Badge>

        <div className="flex items-center gap-1 text-cyan-400 group-hover:text-cyan-300 transition-colors">
          <Code2 className="h-3 w-3" />
          <span className="text-[10px] underline underline-offset-2">View Code</span>
        </div>
      </div>

      {/* Illustrative values are not connected to live telemetry. */}
      {data.metrics ? (
        <div className="mt-2 flex items-center justify-between border-t border-zinc-900 pt-2 text-[9px] font-mono text-zinc-400">
          <div className="flex items-center gap-1">
            <Activity className="h-2.5 w-2.5 text-zinc-500" />
            <span>{(data.metrics as any).rps || 120} rps</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{(data.metrics as any).latency || "12ms"}</span>
          </div>
          {(data.metrics as any).cpu && (
            <div className="flex items-center gap-1">
              <span>CPU {(data.metrics as any).cpu}</span>
            </div>
          )}
          <span className="text-zinc-500">example</span>
        </div>
      ) : null}
    </div>
  );
});
