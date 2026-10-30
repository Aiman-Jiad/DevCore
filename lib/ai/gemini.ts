import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || "";
let genAIClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== "your-gemini-api-key-here") {
  try {
    genAIClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn("Failed to initialize GoogleGenAI client:", err);
  }
}

export const isGeminiConfigured = () => {
  return Boolean(genAIClient && apiKey && !apiKey.includes("your-gemini-api-key"));
};

// =========================================================================
// 1. Architecture Sandbox: Gemini 2.5 Flash System Architecture Generator
// =========================================================================

export interface ArchitectureNodeData {
  [key: string]: any;
  id: string;
  label: string;
  category: "gateway" | "auth" | "service" | "database" | "cache" | "queue" | "storage" | "frontend" | "ai";
  description: string;
  tech: string;
  status: "healthy" | "active" | "standby" | "alert";
  ports?: string[];
  metrics?: { rps?: number; latency?: string; cpu?: string };
  codeSnippet?: string;
  fileName?: string;
}

export interface GeneratedArchitecture {
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: ArchitectureNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
    style?: Record<string, string>;
  }>;
  summary: {
    systemName: string;
    paradigm: string;
    scalabilityScore: number;
    overview: string;
    securityNotes: string;
  };
}

export async function generateSystemArchitecture(prompt: string): Promise<GeneratedArchitecture> {
  if (prompt.length > 2000) throw new Error("Architecture prompts must be 2,000 characters or fewer.");
  const systemPrompt = `You are a Principal Software Architect.
Given a concept or prompt for a software system, design a modern, scalable distributed architecture graph.
Return ONLY a valid JSON object matching the following structure:
{
  "nodes": [
    {
      "id": "node-1",
      "position": { "x": 100, "y": 200 },
      "data": {
        "id": "node-1",
        "label": "API Gateway",
        "category": "gateway", // one of: "gateway", "auth", "service", "database", "cache", "queue", "storage", "frontend", "ai"
        "description": "Reverse proxy, rate limiting, and route dispatching",
        "tech": "Kong / Envoy / Next.js",
        "status": "active",
        "ports": ["http:80", "https:443"],
        "fileName": "gateway.ts",
        "codeSnippet": "// API Gateway router implementation\\n..."
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "node-1",
      "target": "node-2",
      "label": "gRPC / TLS",
      "animated": true
    }
  ],
  "summary": {
    "systemName": "E-Commerce Microservices Platform",
    "paradigm": "Event-Driven & CQRS",
        "scalabilityScore": 50,
    "overview": "Detailed overview of the system architecture...",
    "securityNotes": "Zero-trust service mesh with JWT token validation."
  }
}

Do not invent runtime telemetry, performance numbers, deployment health, or measured scalability. Leave metrics out. Treat scalabilityScore as a rough design estimate, not a measured result. Layout nodes left to right with clear spacing. Include concrete trust boundaries and failure handling in the overview/security notes.`;

  if (genAIClient) {
    try {
      const response = await genAIClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\nUser Concept: "${prompt}"`,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      return normalizeArchitecture(JSON.parse(cleaned));
    } catch (error) {
      console.error("Gemini 2.5 Flash Architecture generation error:", error);
      // Fall through to deterministic fallback generator
    }
  }

  // Fallback architectural generator when API key is not configured or fails
  return normalizeArchitecture(getFallbackArchitecture(prompt));
}

// =========================================================================
// 2. Micro View: Deterministic traces for a small supported algorithm subset
// =========================================================================

export interface ExecutionFrame {
  step: number;
  activeLine: number;
  explanation: string;
  variables: Record<string, any>;
  dataStructures?: Array<{
    name: string;
    type: "array" | "hashmap" | "pointers" | "tree" | "matrix";
    values: any;
    highlightedIndices?: number[];
    pointers?: Record<string, number>;
  }>;
  callStack?: string[];
}

export interface AlgorithmicExecutionResult {
  frames: ExecutionFrame[];
  complexity: {
    time: string;
    space: string;
  };
  summary: string;
  status: "success" | "error";
  errorMessage?: string;
}

export async function parseAlgorithmicExecution(
  code: string,
  inputArgs?: string
): Promise<AlgorithmicExecutionResult> {
  return traceSupportedAlgorithm(code, inputArgs);
}

// This tracer deliberately supports a small, explicit subset. It never executes user code
// and does not ask a language model to invent execution state.
function traceSupportedAlgorithm(code: string, inputArgs?: string): AlgorithmicExecutionResult {
  if (code.length > 12000) return unsupportedTrace("Code must be 12,000 characters or fewer.");
  const lines = code.split(/\r?\n/);
  const invocation = code.match(/\b(twoSum|binarySearch)\s*\(\s*(\[[^\]]*\])\s*,\s*(-?\d+)\s*\)/);
  const fromInput = inputArgs?.match(/\[[^\]]*\]/);
  const inputTarget = inputArgs?.match(/(?:target\s*[:=]\s*)?(-?\d+)\s*$/);
  const valuesText = fromInput?.[0] || invocation?.[2];
  const target = inputTarget ? Number(inputTarget[1]) : invocation ? Number(invocation[3]) : NaN;
  if (!valuesText || !Number.isFinite(target)) {
    return unsupportedTrace("Supported today: twoSum and binarySearch with a literal numeric array and target. Code is analyzed, never executed.");
  }
  let values: number[];
  try {
    const parsed = JSON.parse(valuesText);
    if (!Array.isArray(parsed) || !parsed.every(Number.isFinite)) throw new Error();
    values = parsed;
  } catch {
    return unsupportedTrace("The trace input must be a JSON array of numbers.");
  }
  if (values.length > 100) return unsupportedTrace("Use 100 values or fewer so every trace stays readable.");
  const algorithm = code.includes("function binarySearch") || code.includes("function binarySearch(") ? "binarySearch" : "twoSum";
  if (algorithm === "twoSum" && (!/while\s*\(\s*left\s*<\s*right\s*\)/.test(code) || !/nums\s*\[\s*left\s*\]\s*\+\s*nums\s*\[\s*right\s*\]/.test(code) || !/sum\s*<\s*target/.test(code) || !/left\+\+/.test(code) || !/right\+\+|right\s*--/.test(code))) return unsupportedTrace("The twoSum tracer requires the standard left/right sum and pointer-update statements.");
  if (algorithm === "binarySearch" && (!/while\s*\(\s*low\s*<=\s*high\s*\)/.test(code) || !/Math\.floor\s*\(\s*\(\s*low\s*\+\s*high\s*\)\s*\/\s*2\s*\)/.test(code) || !/arr\s*\[\s*mid\s*\]/.test(code) || !/low\s*=\s*mid\s*\+\s*1/.test(code) || !/high\s*=\s*mid\s*-\s*1/.test(code))) return unsupportedTrace("The binarySearch tracer requires the standard low/high interval and midpoint updates.");
  if (algorithm === "binarySearch" && values.some((value, i) => i > 0 && values[i - 1] > value)) return unsupportedTrace("binarySearch requires a sorted array.");

  const frames: ExecutionFrame[] = [];
  const lineOf = (pattern: RegExp) => Math.max(1, lines.findIndex((line) => pattern.test(line)) + 1);
  const add = (explanation: string, variables: Record<string, number>, pointers: Record<string, number>, highlighted: number[]) => {
    frames.push({ step: frames.length + 1, activeLine: lineOf(/while\s*\(/), explanation, variables, dataStructures: [{ name: algorithm === "twoSum" ? "nums" : "arr", type: "array", values, highlightedIndices: highlighted, pointers }], callStack: [`${algorithm}([${values.join(", ")}], ${target})`] });
  };
  if (algorithm === "twoSum") {
    if (values.some((value, i) => i > 0 && values[i - 1] > value)) return unsupportedTrace("twoSum requires a sorted array; sort the input or use a hash-map implementation.");
    let left = 0, right = values.length - 1;
    while (left < right && frames.length < 100) {
      const sum = values[left] + values[right];
      add(`Compare ${values[left]} + ${values[right]} = ${sum}.`, { left, right, sum, target }, { left, right }, [left, right]);
      if (sum === target) break;
      if (sum < target) left++; else right--;
    }
    if (frames.length === 0) add("The interval is empty; no pair can be checked.", { left: 0, right: -1, target }, {}, []);
    return { frames, complexity: { time: "O(n)", space: "O(1)" }, summary: frames.length === 100 ? "First 100 iterations of a deterministic two-pointer trace." : "Deterministic two-pointer trace for a sorted array.", status: "success" };
  }
  let low = 0, high = values.length - 1;
  while (low <= high && frames.length < 100) {
    const mid = Math.floor((low + high) / 2), midVal = values[mid];
    frames.push({ step: frames.length + 1, activeLine: lineOf(/const\s+mid\s*=/), explanation: `Check index ${mid}: ${midVal} versus ${target}.`, variables: { low, high, mid, midVal, target }, dataStructures: [{ name: "arr", type: "array", values, highlightedIndices: [mid], pointers: { low, high, mid } }], callStack: [`binarySearch([${values.join(", ")}], ${target})`] });
    if (midVal === target) break;
    if (midVal < target) low = mid + 1; else high = mid - 1;
  }
  return { frames, complexity: { time: "O(log n)", space: "O(1)" }, summary: frames.length === 100 ? "First 100 iterations of a deterministic binary-search trace." : "Deterministic binary-search trace.", status: "success" };
}

function unsupportedTrace(message: string): AlgorithmicExecutionResult {
  return { frames: [], complexity: { time: "—", space: "—" }, summary: message, status: "error", errorMessage: message };
}

function normalizeArchitecture(value: unknown): GeneratedArchitecture {
  if (!value || typeof value !== "object") throw new Error("AI returned an invalid architecture.");
  const candidate = value as Partial<GeneratedArchitecture>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges) || !candidate.summary) throw new Error("AI returned an incomplete architecture.");
  if (candidate.nodes.length > 30) throw new Error("Architecture is too large. Generate 30 nodes or fewer.");
  const ids = new Set(candidate.nodes.map((node) => node.id));
  if (ids.size !== candidate.nodes.length || candidate.nodes.some((node) => !node.id || !node.data?.label || !Number.isFinite(node.position?.x) || !Number.isFinite(node.position?.y))) throw new Error("Architecture contains invalid or duplicate nodes.");
  if (candidate.edges.some((edge) => !ids.has(edge.source) || !ids.has(edge.target))) throw new Error("Architecture contains a connection to a missing node.");
  return {
    ...(candidate as GeneratedArchitecture),
    nodes: candidate.nodes.map((node) => ({ ...node, data: { ...node.data, metrics: undefined, status: "active" } })),
  };
}


// =========================================================================
// 3. BugDNA Engine: AI-assisted code issue analysis
// =========================================================================

export interface BugDNAAnalysis {
  error_type: string;
  cognitive_pattern: string;
  mental_model_flaw: string;
  cognitive_bias: string;
  preventative_heuristic: string;
  snippet: string;
  resolution: string;
  detailed_explanation: string;
  category: "Bounds & Pointers" | "Async & Race Conditions" | "Memory & Mutation" | "Type & Coercion" | "Algorithm & Invariant";
  severity: "Low" | "Medium" | "High" | "Critical";
  frequencyRisk: number; // 0 - 100
}

export async function analyzeWithBugDNA(
  codeSnippet: string,
  errorMessage: string,
  context?: string
): Promise<BugDNAAnalysis> {
  if (codeSnippet.length > 12000 || errorMessage.length > 2000 || (context?.length || 0) > 2000) throw new Error("Bug analysis input is too long.");
  const prompt = `You are a code review assistant. Analyze the observable code and reported behavior only.
Do not infer the developer's personality, psychology, intent, or stable cognitive traits. Describe a possible coding pattern and the concrete invariant or condition that is missing. Treat categories and severity as tentative suggestions supported by the supplied evidence.

Code Snippet:
\`\`\`typescript
${codeSnippet}
\`\`\`

Reported Error / Flaw:
${errorMessage}

Additional Context:
${context || "No execution evidence supplied"}

Explain the likely technical pattern in this snippet and what evidence supports that interpretation.
Choose a concise technical bug-pattern label from these examples:
- "Off-by-One Boundary Oversights"
- "Unhandled Async State Race Conditions"
- "Mutation of Shared State Reference"
- "Implicit Type Coercion Blindspot"
- "Premature Optimization Fallacy"
- "Nullish Property Access Neglect"
- "Stale Closure State Capture"
- "Incomplete Invariant Enforcement"

Return ONLY a valid JSON object matching this structure:
{
  "error_type": "IndexOutOfBounds / Boundary Mismatch",
  "cognitive_pattern": "Off-by-One Boundary Oversights",
  "mental_model_flaw": "Possible invariant gap: loop permits an index equal to array length.",
  "cognitive_bias": "Not assessed",
  "preventative_heuristic": "Check loop invariants: For array of length N, last valid index is strictly N-1. Replace '<=' with '<'.",
  "snippet": "${codeSnippet.replace(/"/g, '\\"').replace(/\n/g, "\\n")}",
  "resolution": "// Corrected code\\n...",
  "detailed_explanation": "Explain the observable behavior, likely cause, and a way to prevent this class of bug...",
  "category": "Bounds & Pointers",
  "severity": "Medium",
  "frequencyRisk": 50
}

Set frequencyRisk to a cautious estimate of how strongly the code supports this pattern. It is not a prediction about the developer or a recurrence rate.`;

  if (genAIClient) {
    try {
      const response = await genAIClient.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned) as BugDNAAnalysis;
      if (!parsed || typeof parsed !== "object" || typeof parsed.resolution !== "string" || typeof parsed.detailed_explanation !== "string") throw new Error("AI returned an incomplete bug analysis.");
      return parsed;
    } catch (error) {
      console.error("Gemini 2.5 Pro BugDNA error:", error);
    }
  }

  return getFallbackBugDNAAnalysis(codeSnippet, errorMessage);
}

// =========================================================================
// Realistic Fallbacks for zero-setup demo experience
// =========================================================================

function getFallbackArchitecture(concept: string): GeneratedArchitecture {
  const isAi = concept.toLowerCase().includes("ai") || concept.toLowerCase().includes("agent");
  const isCommerce = concept.toLowerCase().includes("shop") || concept.toLowerCase().includes("pay") || concept.toLowerCase().includes("cart");

  if (isAi) {
    return {
      nodes: [
        {
          id: "node-client",
          position: { x: 50, y: 180 },
          data: {
            id: "node-client",
            label: "Web & Mobile Client",
            category: "frontend",
            description: "Next.js 15 App with streaming LLM response interface",
            tech: "React 19, TypeScript, Tailwind",
            status: "active",
            ports: ["https:443"],
            metrics: { rps: 340, latency: "28ms" },
            fileName: "client.tsx",
            codeSnippet: "export default function AiClient() {\n  // Stream reader\n}",
          },
        },
        {
          id: "node-gateway",
          position: { x: 300, y: 180 },
          data: {
            id: "node-gateway",
            label: "AI Gateway & Router",
            category: "gateway",
            description: "Semantic cache, token budgeter, rate limiting",
            tech: "Cloudflare Workers / Envoy",
            status: "healthy",
            ports: ["grpc:50051", "http:8080"],
            metrics: { rps: 850, latency: "9ms", cpu: "18%" },
            fileName: "gateway.ts",
            codeSnippet: "export async function routeRequest(req: Request) {\n  // Token check & semantic cache\n}",
          },
        },
        {
          id: "node-orchestrator",
          position: { x: 580, y: 100 },
          data: {
            id: "node-orchestrator",
            label: "Agent Orchestrator",
            category: "ai",
            description: "Multi-agent coordination, tool dispatch, memory state machine",
            tech: "Python / Node LangGraph",
            status: "active",
            ports: ["grpc:50052"],
            metrics: { rps: 210, latency: "140ms", cpu: "64%" },
            fileName: "agent.ts",
            codeSnippet: "class AgentOrchestrator {\n  async planAndExecute(task: string) {}\n}",
          },
        },
        {
          id: "node-vectordb",
          position: { x: 580, y: 280 },
          data: {
            id: "node-vectordb",
            label: "Vector Store & RAG",
            category: "database",
            description: "HNSW index for high-dimensional embeddings and doc chunks",
            tech: "pgvector / Pinecone",
            status: "healthy",
            ports: ["tcp:5432"],
            metrics: { rps: 450, latency: "16ms" },
            fileName: "vectorStore.ts",
            codeSnippet: "export async function similaritySearch(embedding: number[]) {\n  // pgvector query\n}",
          },
        },
        {
          id: "node-cache",
          position: { x: 860, y: 100 },
          data: {
            id: "node-cache",
            label: "Semantic Redis Cache",
            category: "cache",
            description: "Embeddings cosine similarity cache for zero-latency prompt reuse",
            tech: "Redis Cluster",
            status: "healthy",
            ports: ["tcp:6379"],
            metrics: { rps: 2400, latency: "2ms" },
            fileName: "cache.ts",
            codeSnippet: "export const redisCache = new Redis();",
          },
        },
        {
          id: "node-queue",
          position: { x: 860, y: 280 },
          data: {
            id: "node-queue",
            label: "Async Inference Queue",
            category: "queue",
            description: "Durable event bus for long-running batch inference jobs",
            tech: "Apache Kafka / RabbitMQ",
            status: "healthy",
            ports: ["tcp:9092"],
            metrics: { rps: 1200, latency: "5ms" },
            fileName: "queueWorker.ts",
            codeSnippet: "export async function consumeInferenceJobs() {}",
          },
        },
      ],
      edges: [
        { id: "e1", source: "node-client", target: "node-gateway", label: "SSE / WebSocket", animated: true },
        { id: "e2", source: "node-gateway", target: "node-orchestrator", label: "gRPC Prompt Stream", animated: true },
        { id: "e3", source: "node-orchestrator", target: "node-vectordb", label: "RAG Context Query", animated: false },
        { id: "e4", source: "node-orchestrator", target: "node-cache", label: "Semantic Lookup", animated: true },
        { id: "e5", source: "node-orchestrator", target: "node-queue", label: "Enqueue Batch", animated: false },
      ],
      summary: {
        systemName: "Autonomous Multi-Agent AI Processing Core",
        paradigm: "Event-Driven RAG & Semantic Cache",
        scalabilityScore: 94,
        overview: "Modern AI agent hub with edge gateway caching, low-latency pgvector retrieval, and asynchronous Kafka workers.",
        securityNotes: "Fine-grained token budget quotas and prompt injection guardrails at the API gateway layer.",
      },
    };
  }

  // Default modern fullstack microservices architecture
  return {
    nodes: [
      {
        id: "node-frontend",
        position: { x: 60, y: 180 },
        data: {
          id: "node-frontend",
          label: "Next.js Web Client",
          category: "frontend",
          description: "Edge-rendered frontend with React Server Components & Zustand state",
          tech: "Next.js 15, TypeScript",
          status: "active",
          ports: ["https:443"],
          metrics: { rps: 1800, latency: "18ms" },
          fileName: "frontend.tsx",
          codeSnippet: "export function App() {\n  return <Dashboard />;\n}",
        },
      },
      {
        id: "node-apigw",
        position: { x: 320, y: 180 },
        data: {
          id: "node-apigw",
          label: "API Gateway",
          category: "gateway",
          description: "Central entrypoint with TLS termination, auth guards & rate limiting",
          tech: "Envoy / Traefik",
          status: "healthy",
          ports: ["http:80", "https:443"],
          metrics: { rps: 4500, latency: "6ms", cpu: "24%" },
          fileName: "gateway.ts",
          codeSnippet: "export async function dispatch(req: Request) {\n  // Rate limit & verify JWT\n}",
        },
      },
      {
        id: "node-auth",
        position: { x: 580, y: 60 },
        data: {
          id: "node-auth",
          label: "Auth & Identity Service",
          category: "auth",
          description: "OAuth 2.0, Supabase Auth, Google IdP token validation",
          tech: "Go / Supabase SSR",
          status: "healthy",
          ports: ["http:8081"],
          metrics: { rps: 980, latency: "12ms" },
          fileName: "authService.ts",
          codeSnippet: "export async function verifyToken(jwt: string) {\n  return supabase.auth.getUser(jwt);\n}",
        },
      },
      {
        id: "node-core",
        position: { x: 580, y: 220 },
        data: {
          id: "node-core",
          label: "Core API Service",
          category: "service",
          description: "Domain logic, business validation, and CRUD operations",
          tech: "Node.js / Express",
          status: "healthy",
          ports: ["http:8082"],
          metrics: { rps: 3100, latency: "32ms", cpu: "42%" },
          fileName: "coreService.ts",
          codeSnippet: "export async function handleProjectMutation(data: any) {\n  // Validate & persist\n}",
        },
      },
      {
        id: "node-db",
        position: { x: 860, y: 60 },
        data: {
          id: "node-db",
          label: "PostgreSQL Primary",
          category: "database",
          description: "Relational storage with Row-Level Security and foreign key constraints",
          tech: "Supabase / PostgreSQL 16",
          status: "healthy",
          ports: ["tcp:5432"],
          metrics: { rps: 2800, latency: "8ms", cpu: "38%" },
          fileName: "schema.sql",
          codeSnippet: "SELECT * FROM projects WHERE user_id = auth.uid();",
        },
      },
      {
        id: "node-cache",
        position: { x: 860, y: 220 },
        data: {
          id: "node-cache",
          label: "Redis Cache Cluster",
          category: "cache",
          description: "Sub-millisecond read layer for hot sessions and active graphs",
          tech: "Redis 7.2",
          status: "healthy",
          ports: ["tcp:6379"],
          metrics: { rps: 8200, latency: "1.5ms" },
          fileName: "cache.ts",
          codeSnippet: "await redis.setex(`project:${id}`, 3600, json);",
        },
      },
      {
        id: "node-queue",
        position: { x: 860, y: 380 },
        data: {
          id: "node-queue",
          label: "RabbitMQ Event Bus",
          category: "queue",
          description: "Decoupled asynchronous processing for heavy jobs and analytics",
          tech: "RabbitMQ / AMQP",
          status: "healthy",
          ports: ["tcp:5672"],
          metrics: { rps: 940, latency: "4ms" },
          fileName: "events.ts",
          codeSnippet: "channel.publish('events_exchange', 'project.created', payload);",
        },
      },
    ],
    edges: [
      { id: "e-front-gw", source: "node-frontend", target: "node-apigw", label: "HTTPS / REST", animated: true },
      { id: "e-gw-auth", source: "node-apigw", target: "node-auth", label: "Validate Bearer", animated: true },
      { id: "e-gw-core", source: "node-apigw", target: "node-core", label: "Forward Route", animated: true },
      { id: "e-core-db", source: "node-core", target: "node-db", label: "SQL Queries / RLS", animated: false },
      { id: "e-core-cache", source: "node-core", target: "node-cache", label: "Get / Set Cache", animated: true },
      { id: "e-core-queue", source: "node-core", target: "node-queue", label: "Publish Events", animated: false },
    ],
    summary: {
      systemName: "DevCore Distributed Engineering Hub",
      paradigm: "Layered Microservices with Edge Gateway",
      scalabilityScore: 96,
      overview: "Resilient polyglot architecture featuring Next.js edge frontends, sub-millisecond Redis caching, and PostgreSQL with RLS.",
      securityNotes: "All outbound calls encrypted via mTLS; database protected with Supabase Row Level Security.",
    },
  };
}

// =========================================================================
// 5. Language-Aware Code Assistance (Multi-Language Support)
// =========================================================================

export interface CodeAssistanceResult {
  explanation: string;
  improved_code: string;
  language: string;
  suggestions: string[];
  runtime_note: string | null;
}

/** Languages that can be executed/previewed live in the browser */
export const BROWSER_RUNNABLE_LANGUAGES = new Set(["html", "css", "javascript", "typescript"]);

/** Returns a human-readable note for non-runnable languages */
export function getRuntimeNote(language: string): string | null {
  if (BROWSER_RUNNABLE_LANGUAGES.has(language)) return null;
  const notes: Record<string, string> = {
    python: "Python cannot be executed in-browser. Use a local runtime (python3 / Jupyter) or a cloud sandbox like Google Colab.",
    cpp: "C++ requires compilation (g++, clang++). Use a local compiler or an online tool like Godbolt / Replit.",
    c: "C requires a compiler (gcc, clang). Use a local toolchain or an online sandbox.",
    java: "Java requires the JDK and javac. Run locally with `javac File.java && java File`, or use IntelliJ / VS Code.",
    go: "Go requires the Go toolchain. Run locally with `go run main.go` or use the Go Playground.",
    rust: "Rust requires rustc. Run locally with `cargo run` or use the Rust Playground.",
    sql: "SQL requires a database engine (PostgreSQL, MySQL, SQLite). Use Supabase, DBeaver, or an online SQL editor.",
  };
  return notes[language] ?? `${language} requires an external runtime. Run this code locally in the appropriate environment.`;
}

export async function generateLanguageAwareCodeAssistance(
  code: string,
  language: string,
  prompt: string
): Promise<CodeAssistanceResult> {
  const runtimeNote = getRuntimeNote(language);

  if (!isGeminiConfigured() || !genAIClient) {
    return {
      explanation: `AI assistance requires a configured Gemini API key. ${runtimeNote ? `Note: ${runtimeNote}` : ""}`,
      improved_code: code,
      language,
      suggestions: ["Configure GEMINI_API_KEY in your .env.local to enable AI-powered code assistance."],
      runtime_note: runtimeNote,
    };
  }

  const systemPrompt = `You are an expert software engineer specializing in ${language}.
Analyze the provided code and respond to the user's request.
Always return ONLY a valid JSON object with this structure:
{
  "explanation": "Brief explanation of what the code does and what you changed",
  "improved_code": "The improved or analyzed version of the code",
  "language": "${language}",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "runtime_note": null
}
Do NOT include any markdown, code fences, or extra text — ONLY the JSON object.`;

  const userPrompt = `Language: ${language}

Code:
\`\`\`${language}
${code.slice(0, 8000)}
\`\`\`

User request: ${prompt}`;

  try {
    const response = await genAIClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    const raw = response.text?.trim() ?? "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");
    const result = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as CodeAssistanceResult;
    result.runtime_note = runtimeNote;
    return result;
  } catch (err) {
    console.error("Language-aware assistance error:", err);
    return {
      explanation: `AI analysis failed. ${runtimeNote ? `Note: ${runtimeNote}` : ""}`,
      improved_code: code,
      language,
      suggestions: ["Check your code syntax", "Review the logic for edge cases", "Add error handling"],
      runtime_note: runtimeNote,
    };
  }
}

function getFallbackBugDNAAnalysis(snippet: string, error: string): BugDNAAnalysis {
  const isAsync = snippet.includes("async") || snippet.includes("Promise") || error.includes("race");
  const isMutation = snippet.includes(".push(") || snippet.includes("splice") || snippet.includes("state");

  if (isAsync) {
    return {
      error_type: "Race Condition / Unhandled Async Resolution",
      cognitive_pattern: "Unhandled Async State Race Conditions",
      mental_model_flaw: "Possible invariant gap: older requests can still update state after a newer request completes.",
      cognitive_bias: "Not assessed",
      preventative_heuristic: "Always bind async side-effects to an AbortSignal or ignore stale execution tokens when state transitions rapidly.",
      snippet,
      resolution: `// Solution: Guard with cancellation flag or AbortController\nlet isCurrent = true;\ntry {\n  const data = await fetchPayload();\n  if (isCurrent) setState(data);\n} finally {\n  // cleanup\n}`,
      detailed_explanation: "The code awaits one request without checking whether a newer request has superseded it. Variable response times can allow stale data to update state.",
      category: "Async & Race Conditions",
      severity: "High",
      frequencyRisk: 68,
    };
  }

  if (isMutation) {
    return {
      error_type: "State Mutation Leak / Reference Contamination",
      cognitive_pattern: "Mutation of Shared State Reference",
      mental_model_flaw: "Possible invariant gap: a shared array or object may be mutated in place.",
      cognitive_bias: "Not assessed",
      preventative_heuristic: "Enforce immutability primitives (structuredClone, object spread, or Immer) before modifying nested objects.",
      snippet,
      resolution: `// Solution: Create a shallow/deep clone before modifying\nconst nextState = { ...state, items: [...state.items, newItem] };`,
      detailed_explanation: "In-place mutation can change shared state without the expected update path, making behavior difficult to trace. Confirm that the value is shared and immutable updates are expected here.",
      category: "Memory & Mutation",
      severity: "Medium",
      frequencyRisk: 74,
    };
  }

  return {
    error_type: "Boundary Invariant Violation / Off-by-One",
    cognitive_pattern: "Off-by-One Boundary Oversights",
    mental_model_flaw: "Possible invariant gap: a loop may allow an index equal to the array length.",
    cognitive_bias: "Not assessed",
    preventative_heuristic: "Verify extreme boundaries explicitly: What happens at index 0? What happens at index N-1? And what happens if index == N?",
    snippet,
    resolution: `// Corrected boundary invariant: use strict '<' for 0-indexed arrays\nfor (let i = 0; i < array.length; i++) {\n  processItem(array[i]);\n}`,
    detailed_explanation: "For an array with N entries, valid indices are 0 through N-1. A loop condition that includes N can read past the end. Verify the boundary against the actual data structure and intended loop behavior.",
    category: "Bounds & Pointers",
    severity: "Medium",
    frequencyRisk: 82,
  };
}
