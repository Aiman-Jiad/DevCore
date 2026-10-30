"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FolderUp, Files, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { SUPPORTED_ACCEPT, collectFromDataTransfer, collectFromInput } from "@/lib/utils/codebase";
import { ingestRawFiles } from "@/lib/client/codebase";

export function CodebaseImportButtons() {
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const busy = useWorkspaceStore((s) => s.ingestStatus === "reading" || s.ingestStatus === "analyzing");

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = collectFromInput(e.target.files); // copies into an array first
    e.target.value = "";
    if (raw.length > 0) void ingestRawFiles(raw);
  };

  return (
    <>
      <input
        ref={folderRef}
        type="file"
        multiple
        className="hidden"
        onChange={handle}
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
      <input
        ref={filesRef}
        type="file"
        multiple
        accept={SUPPORTED_ACCEPT}
        className="hidden"
        onChange={handle}
      />
      <Button
        onClick={() => folderRef.current?.click()}
        disabled={busy}
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs font-mono gap-1 text-zinc-300 hover:text-white border-zinc-800 hover:border-cyan-500/50"
        title="Upload a codebase folder (node_modules, .git, .next, dist, build are skipped)"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderUp className="h-3.5 w-3.5 text-cyan-400" />}
        <span className="hidden sm:inline">Upload Codebase Folder</span>
      </Button>
      <Button
        onClick={() => filesRef.current?.click()}
        disabled={busy}
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs font-mono gap-1 text-zinc-300 hover:text-white border-zinc-800 hover:border-cyan-500/50"
        title="Import several files at once"
      >
        <Files className="h-3.5 w-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Import Multi-File</span>
      </Button>
    </>
  );
}

export function useCodebaseDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setIsDragging(false);
      void collectFromDataTransfer(e.dataTransfer).then((raw) => {
        if (raw.length > 0) void ingestRawFiles(raw);
      });
    },
  };
  return { isDragging, dropProps };
}

export function DropOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-cyan-400/70 bg-cyan-500/10 text-xs font-mono text-cyan-200">
      Drop a folder or files to ingest
    </div>
  );
}

export function CodebaseStatusBanner() {
  const status = useWorkspaceStore((s) => s.ingestStatus);
  const message = useWorkspaceStore((s) => s.ingestMessage);
  const setIngestStatus = useWorkspaceStore((s) => s.setIngestStatus);
  if (status === "idle") return null;

  const busy = status === "reading" || status === "analyzing";
  const tone =
    status === "error"
      ? "bg-red-950/40 border-red-500/30 text-red-300"
      : status === "done"
      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
      : "bg-cyan-950/30 border-cyan-500/30 text-cyan-200";

  return (
    <div className={`flex items-center justify-between gap-3 border-b px-4 py-1.5 text-[11px] font-mono ${tone}`}>
      <div className="flex min-w-0 items-center gap-2">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : status === "error" ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{message}</span>
      </div>
      {!busy && (
        <button onClick={() => setIngestStatus("idle")} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}