"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  Folder,
  FolderOpen,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import {
  ANALYZABLE_LANGUAGES,
  buildFileTree,
  detectLanguage,
  type TreeNode,
} from "@/lib/utils/codebase";

function FileIcon({ name }: { name: string }) {
  const lang = detectLanguage(name);
  if (lang === "json") return <FileJson className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
  if (ANALYZABLE_LANGUAGES.has(lang)) return <FileCode className="h-3.5 w-3.5 shrink-0 text-cyan-400" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-zinc-500" />;
}

interface DeleteTarget {
  path: string;
  isDir: boolean;
  childCount: number;
  name: string;
}

export function FileExplorer() {
  // Primitive-string selectors so keystrokes in the editor do not rebuild the tree
  const pathKey = useWorkspaceStore((s) => Object.keys(s.projectFiles).sort().join("\n"));
  const mappedKey = useWorkspaceStore((s) =>
    s.nodes.map((n) => (n.data as any)?.filePath).filter(Boolean).join("\n")
  );
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const removeFile = useWorkspaceStore((s) => s.removeFile);
  const removeFolder = useWorkspaceStore((s) => s.removeFolder);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const tree = useMemo(() => buildFileTree(pathKey.split("\n").filter(Boolean)), [pathKey]);
  const mapped = useMemo(() => new Set(mappedKey.split("\n").filter(Boolean)), [mappedKey]);
  const allPaths = useMemo(() => pathKey.split("\n").filter(Boolean), [pathKey]);
  const fileCount = allPaths.length;

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const getChildCount = (dirPath: string): number => {
    const prefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
    return allPaths.filter((p) => p === dirPath || p.startsWith(prefix)).length;
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.isDir) {
        removeFolder(deleteTarget.path);
      } else {
        removeFile(deleteTarget.path);
      }
      setDeleteStatus("success");
      setStatusMsg(`Deleted ${deleteTarget.isDir ? "folder" : "file"}: ${deleteTarget.name}`);
    } catch {
      setDeleteStatus("error");
      setStatusMsg("Delete failed");
    }
    setDeleteTarget(null);
    setTimeout(() => {
      setDeleteStatus("idle");
      setStatusMsg("");
    }, 2500);
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const pad = { paddingLeft: 8 + depth * 12 };
    if (node.isDir) {
      const isCollapsed = collapsed.has(node.path);
      const childCount = getChildCount(node.path);
      return (
        <div key={`d:${node.path}`}>
          <div
            style={pad}
            className="group flex w-full items-center gap-1 pr-1 text-left text-[11px] font-mono text-zinc-300 hover:bg-zinc-900"
          >
            <button
              onClick={() => toggle(node.path)}
              className="flex flex-1 min-w-0 items-center gap-1 py-1"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 shrink-0" />
              )}
              {isCollapsed ? (
                <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ path: node.path, isDir: true, childCount, name: node.name });
              }}
              className="ml-auto shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
              title={`Delete folder ${node.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {!isCollapsed && node.children.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }
    const active = node.path === activeFilePath;
    return (
      <div
        key={`f:${node.path}`}
        className={`group flex w-full items-center pr-1 transition-colors ${
          active ? "bg-cyan-500/15" : "hover:bg-zinc-900"
        }`}
      >
        <button
          onClick={() => openFile(node.path)}
          style={{ paddingLeft: 8 + depth * 12 + 16 }}
          title={node.path}
          className={`flex flex-1 min-w-0 items-center gap-1.5 py-1 text-left text-[11px] font-mono ${
            active ? "text-cyan-200" : "text-zinc-400 group-hover:text-zinc-200"
          }`}
        >
          <FileIcon name={node.name} />
          <span className="truncate">{node.name}</span>
          {mapped.has(node.path) && (
            <span
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400"
              title="Mapped on canvas"
            />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget({ path: node.path, isDir: false, childCount: 0, name: node.name });
          }}
          className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
          title={`Delete ${node.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          <span>Explorer</span>
          <span>{fileCount} files</span>
        </div>

        {/* Status feedback banner */}
        {deleteStatus !== "idle" && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono border-b ${
              deleteStatus === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/40 border-red-500/30 text-red-300"
            }`}
          >
            <span className="truncate">{statusMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">{tree.map((n) => renderNode(n, 0))}</div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-950/60 border border-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-mono text-zinc-100">
                  Delete {deleteTarget.isDir ? "Folder" : "File"}
                </h3>
                <p className="mt-1 text-xs font-mono text-zinc-400">
                  {deleteTarget.isDir
                    ? `Delete "${deleteTarget.name}/" and its ${deleteTarget.childCount} file${deleteTarget.childCount !== 1 ? "s" : ""}? This cannot be undone.`
                    : `Delete "${deleteTarget.name}"? This cannot be undone.`}
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="ml-auto shrink-0 text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-mono font-semibold text-white hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
