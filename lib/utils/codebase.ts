export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
}
export interface RawFile {
  file: File;
  path: string;
}
export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

export const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build",
  ".turbo", ".vercel", "coverage", "__pycache__", ".venv",
]);
const IGNORED_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"]);
export const MAX_FILE_BYTES = 300_000;
export const MAX_FILES = 400;
const MAX_SCAN = 5000;

const EXT_LANGUAGE: Record<string, string> = {
  ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  py: "python",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hh: "cpp",
  c: "c", h: "c",
  java: "java", go: "go", rs: "rust", sql: "sql", json: "json",
  css: "css", html: "html", md: "markdown", yml: "yaml", yaml: "yaml",
};
export const SUPPORTED_ACCEPT = Object.keys(EXT_LANGUAGE).map((e) => `.${e}`).join(",");
export const ANALYZABLE_LANGUAGES = new Set([
  "typescript", "javascript", "python", "cpp", "c", "java", "go", "rust", "sql", "html", "css",
]);

// Languages whose execution can be previewed/run live in the browser
export const RUNTIME_SUPPORTED_LANGUAGES = new Set(["html", "css", "javascript", "typescript"]);

// Human-readable labels for language display in UI
export const LANGUAGE_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
  c: "C",
  java: "Java",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
  yaml: "YAML",
  plaintext: "Plain Text",
};

export function getLanguageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang] ?? lang;
}

function extOf(name: string) {
  const base = name.split("/").pop() ?? name;
  const i = base.lastIndexOf(".");
  return i < 0 ? "" : base.slice(i + 1).toLowerCase();
}
export function detectLanguage(name: string): string {
  return EXT_LANGUAGE[extOf(name)] ?? "plaintext";
}
export function isSupportedFile(name: string): boolean {
  return extOf(name) in EXT_LANGUAGE;
}

export function shouldIgnorePath(path: string): boolean {
  const segs = path.split("/");
  const last = segs[segs.length - 1];
  if (segs.slice(0, -1).some((s) => IGNORED_DIRS.has(s))) return true;
  return IGNORED_FILES.has(last) || /\.min\.(js|css)$/.test(last) || last.endsWith(".map");
}

// ---------- Collecting files from the browser ----------

export function collectFromInput(list: FileList | null): RawFile[] {
  if (!list) return [];
  return Array.from(list).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

async function walkEntry(entry: FileSystemEntry, out: RawFile[], prefix: string, isRoot: boolean): Promise<void> {
  if (out.length > MAX_SCAN) return;
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej)
    );
    out.push({ file, path: prefix + entry.name });
  } else if (entry.isDirectory) {
    // Never descend into node_modules, .git, etc. (the picker can't do this, drag-drop can)
    if (!isRoot && IGNORED_DIRS.has(entry.name)) return;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const readBatch = () =>
      new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
    let batch: FileSystemEntry[];
    while ((batch = await readBatch()).length > 0) {
      for (const child of batch) {
        await walkEntry(child, out, `${prefix}${entry.name}/`, false);
      }
    }
  }
}

// IMPORTANT: webkitGetAsEntry must run synchronously inside the drop handler,
// so entries are read BEFORE the first await.
export async function collectFromDataTransfer(dt: DataTransfer): Promise<RawFile[]> {
  const entries = Array.from(dt.items ?? [])
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (entries.length === 0) {
    return Array.from(dt.files).map((file) => ({ file, path: file.name }));
  }
  const out: RawFile[] = [];
  for (const e of entries) await walkEntry(e, out, "", true);
  return out;
}

function stripCommonRoot(raw: RawFile[]): RawFile[] {
  if (raw.length === 0) return raw;
  const first = raw[0].path.split("/")[0];
  const shared = raw.every((r) => r.path.includes("/") && r.path.split("/")[0] === first);
  return shared ? raw.map((r) => ({ ...r, path: r.path.slice(first.length + 1) })) : raw;
}

export async function readRawFiles(
  raw: RawFile[]
): Promise<{ files: ProjectFile[]; skipped: number }> {
  const candidates = stripCommonRoot(raw)
    .filter((r) => !shouldIgnorePath(r.path) && isSupportedFile(r.path) && r.file.size <= MAX_FILE_BYTES)
    .slice(0, MAX_FILES);

  const files: ProjectFile[] = [];
  for (let i = 0; i < candidates.length; i += 25) {
    const chunk = candidates.slice(i, i + 25);
    const read = await Promise.all(
      chunk.map(async (r): Promise<ProjectFile | null> => {
        try {
          const content = await r.file.text();
          if (content.includes("\u0000")) return null; // binary
          return { path: r.path, content, language: detectLanguage(r.path), size: content.length };
        } catch {
          return null;
        }
      })
    );
    read.forEach((f) => f && files.push(f));
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped: raw.length - files.length };
}

// ---------- Helpers ----------

/** Trim to fit under the Server Action body limit (1MB default). */
export function prepareFileMap(
  files: ProjectFile[],
  opts: { perFile?: number; total?: number } = {}
): Record<string, string> {
  const perFile = opts.perFile ?? 12_000;
  const total = opts.total ?? 700_000;
  const map: Record<string, string> = {};
  let used = 0;
  for (const f of files) {
    if (!ANALYZABLE_LANGUAGES.has(f.language)) continue;
    const content =
      f.content.length > perFile ? f.content.slice(0, perFile) + "\n/* …truncated… */" : f.content;
    if (used + content.length > total) break;
    map[f.path] = content;
    used += content.length;
  }
  return map;
}

export function pickEntryFile(paths: string[]): string | null {
  if (paths.length === 0) return null;
  const entryRe = /(^|\/)(index|main|app|page|server)\.(tsx?|jsx?|py|go|rs|java|cpp|c)$/;
  const hits = paths
    .filter((p) => entryRe.test(p))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  return hits[0] ?? [...paths].sort()[0];
}

export function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const isDir = i < parts.length - 1;
      const full = parts.slice(0, i + 1).join("/");
      let child = cur.children.find((c) => c.name === part && c.isDir === isDir);
      if (!child) {
        child = { name: part, path: full, isDir, children: [] };
        cur.children.push(child);
      }
      cur = child;
    });
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    n.children.forEach(sort);
  };
  sort(root);
  return root.children;
}