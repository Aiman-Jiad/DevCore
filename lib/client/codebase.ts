"use client";

import {
  analyzeBugDNAAction,
  analyzeCodebaseDependenciesAction,
  analyzeCrossFileBugDNAAction,
} from "@/app/actions";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { prepareFileMap, readRawFiles, type RawFile } from "@/lib/utils/codebase";

export async function ingestRawFiles(raw: RawFile[]): Promise<void> {
  const store = () => useWorkspaceStore.getState();
  store().setIngestStatus("reading", `Reading ${raw.length} files…`);
  try {
    const { files, skipped } = await readRawFiles(raw);
    if (files.length === 0) {
      store().setIngestStatus(
        "error",
        "No supported source files found (node_modules, .git, .next, dist and build are skipped)."
      );
      return;
    }
    store().setProjectFiles(files);
    store().setIngestStatus(
      "analyzing",
      `Loaded ${files.length} files (${skipped} skipped). Mapping connections with Gemini 2.5 Pro…`
    );
    const graph = await analyzeCodebaseDependenciesAction(prepareFileMap(files));
    store().applyCodebaseGraph(graph);
    store().setIngestStatus(
      "done",
      `Mapped ${graph.nodes.length} modules and ${graph.edges.length} connections` +
        (graph.stats.usedFallback ? " (import-based fallback; AI labels unavailable)." : ".")
    );
  } catch (err: any) {
    console.error("Codebase ingestion failed:", err);
    store().setIngestStatus("error", err?.message || "Codebase ingestion failed");
  }
}

/** Single-file BugDNA when no project is loaded, cross-file BugDNA when one is. */
export async function runBugDnaAnalysis(): Promise<boolean> {
  const s = useWorkspaceStore.getState();
  s.setIsAnalyzingBug(true);
  try {
    const errorMsg =
      s.executionError || "Logical flaw, state mutation, or contract violation suspected in the active module.";
    const files = Object.values(s.projectFiles);
    const analysis =
      files.length > 0
        ? await analyzeCrossFileBugDNAAction({
            activePath: s.activeFilePath,
            activeCode: s.activeCode,
            errorMessage: errorMsg,
            fileMap: prepareFileMap(files, { perFile: 8000, total: 600_000 }),
          })
        : await analyzeBugDNAAction(s.activeCode, errorMsg);
    useWorkspaceStore.getState().addBugDnaLog(analysis);
    return true;
  } catch (err) {
    console.error("BugDNA analysis error:", err);
    return false;
  } finally {
    useWorkspaceStore.getState().setIsAnalyzingBug(false);
  }
}