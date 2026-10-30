"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { AlertCircle, ExternalLink, RefreshCw, Monitor, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Build a self-contained HTML document from the current project files.
 * Inlines CSS and JS from projectFiles into the primary HTML file.
 */
function buildSrcDoc(
  htmlContent: string,
  projectFiles: Record<string, { path: string; content: string; language: string; size: number }>,
  activePath: string | null
): string {
  // Collect all CSS and JS from projectFiles (excluding the HTML itself)
  const cssBlocks: string[] = [];
  const jsBlocks: string[] = [];

  Object.values(projectFiles).forEach((f) => {
    if (f.path === activePath || f.path === htmlContent) return;
    if (f.language === "css") cssBlocks.push(`/* ${f.path} */\n${f.content}`);
    if (f.language === "javascript" || f.language === "typescript") {
      // Treat TypeScript as JS for live preview (best-effort)
      jsBlocks.push(`/* ${f.path} */\n${f.content}`);
    }
  });

  let doc = htmlContent;

  // Inject inlined CSS before </head>
  if (cssBlocks.length > 0) {
    const styleTag = `<style>\n${cssBlocks.join("\n\n")}\n</style>`;
    if (doc.includes("</head>")) {
      doc = doc.replace("</head>", `${styleTag}\n</head>`);
    } else {
      doc = styleTag + "\n" + doc;
    }
  }

  // Inject inlined JS before </body>
  if (jsBlocks.length > 0) {
    const scriptTag = `<script>\n${jsBlocks.join("\n\n")}\n</script>`;
    if (doc.includes("</body>")) {
      doc = doc.replace("</body>", `${scriptTag}\n</body>`);
    } else {
      doc = doc + "\n" + scriptTag;
    }
  }

  return doc;
}

export function WebPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSource, setShowSource] = useState(false);

  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const activeCode = useWorkspaceStore((s) => s.activeCode);
  const activeLanguage = useWorkspaceStore((s) => s.activeLanguage);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const previewSrcDoc = useWorkspaceStore((s) => s.previewSrcDoc);
  const setPreviewSrcDoc = useWorkspaceStore((s) => s.setPreviewSrcDoc);

  // Build srcDoc from active code + inlined project files
  const srcDoc = useMemo(() => {
    setIframeError(null);

    // If active file is HTML, use it as the base
    if (activeLanguage === "html") {
      return buildSrcDoc(activeCode, projectFiles, activeFilePath);
    }

    // If active file is CSS or JS only, wrap in minimal HTML shell
    if (activeLanguage === "css") {
      return `<!DOCTYPE html><html><head><style>${activeCode}</style></head><body><p style="font-family:sans-serif;color:#888;padding:20px">CSS preview — no HTML body found. Add an index.html file to your project.</p></body></html>`;
    }

    if (activeLanguage === "javascript" || activeLanguage === "typescript") {
      // Find an HTML file in projectFiles to use as the base
      const htmlFile = Object.values(projectFiles).find((f) => f.language === "html");
      if (htmlFile) {
        return buildSrcDoc(htmlFile.content, projectFiles, htmlFile.path);
      }
      // Wrap JS in a minimal shell
      return `<!DOCTYPE html><html><head></head><body><script>\n${activeCode}\n<\/script></body></html>`;
    }

    return `<!DOCTYPE html><html><head></head><body><p style="font-family:sans-serif;color:#888;padding:20px;background:#09090b">Web Preview only supports HTML, CSS, and JavaScript files. Switch to an HTML/CSS/JS file to enable preview.</p></body></html>`;
  }, [activeCode, activeLanguage, activeFilePath, projectFiles, refreshKey]);

  // Sync to store so other components can read it
  useEffect(() => {
    setPreviewSrcDoc(srcDoc);
  }, [srcDoc, setPreviewSrcDoc]);

  const handleOpenInTab = useCallback(() => {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }, [srcDoc]);

  const isPreviewable = ["html", "css", "javascript", "typescript"].includes(activeLanguage);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-zinc-200">Web Preview</span>
          {!isPreviewable && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
              HTML/CSS/JS only
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSource((v) => !v)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono transition-colors ${
              showSource ? "bg-zinc-800 text-cyan-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Toggle source view"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Source</span>
          </button>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reload preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reload</span>
          </button>

          <button
            onClick={handleOpenInTab}
            disabled={!isPreviewable}
            className="flex items-center gap-1 rounded bg-emerald-600/20 border border-emerald-500/30 px-2 py-1 text-[11px] font-mono text-emerald-300 hover:bg-emerald-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open Tab</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {iframeError && (
        <div className="flex items-center gap-2 border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-xs font-mono text-red-300 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{iframeError}</span>
        </div>
      )}

      {/* Preview / Source body */}
      <div className="flex-1 min-h-0 relative">
        {showSource ? (
          <pre className="h-full overflow-auto p-4 text-[11px] font-mono leading-relaxed text-zinc-300 bg-zinc-900 whitespace-pre-wrap break-words">
            {srcDoc}
          </pre>
        ) : (
          <iframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            className="h-full w-full border-0 bg-white"
            title="Web Preview"
            onError={() => setIframeError("Preview failed to load. Check console for details.")}
          />
        )}
      </div>
    </div>
  );
}
