"use server";

import {
  generateSystemArchitecture,
  parseAlgorithmicExecution,
  analyzeWithBugDNA,
  generateLanguageAwareCodeAssistance,
  type GeneratedArchitecture,
  type AlgorithmicExecutionResult,
  type BugDNAAnalysis,
  type CodeAssistanceResult,
} from "@/lib/ai/gemini";
import {
  analyzeCodebaseDependencies,
  analyzeCrossFileBugDNA,
  type CodebaseGraph,
  type CrossFileBugDNAAnalysis,
  type CrossFileBugDNAInput,
} from "@/lib/ai/codebase";
import { createClient } from "@/lib/supabase/server";

// =========================================================================
// AI Engine Server Actions
// =========================================================================

export async function generateArchitectureAction(prompt: string): Promise<GeneratedArchitecture> {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt is required");
  }
  return await generateSystemArchitecture(prompt);
}

// =========================================================================
// Language-Aware Code Assistance (Multi-Language AI Support)
// =========================================================================

export async function getCodeAssistanceAction(
  code: string,
  language: string,
  prompt: string
): Promise<CodeAssistanceResult> {
  if (!code || typeof code !== "string") throw new Error("Code is required");
  if (!language || typeof language !== "string") throw new Error("Language is required");
  if (!prompt || typeof prompt !== "string") throw new Error("Prompt is required");
  return await generateLanguageAwareCodeAssistance(code, language, prompt);
}

export async function visualizeCodeExecutionAction(
  code: string,
  inputArgs?: string
): Promise<AlgorithmicExecutionResult> {
  if (!code || typeof code !== "string") {
    throw new Error("Code snippet is required");
  }
  return await parseAlgorithmicExecution(code, inputArgs);
}

// Shared Supabase logging for both single-file and cross-file BugDNA
async function persistBugDNA(analysis: BugDNAAnalysis) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("bug_dna_logs").insert({
      user_id: user.id,
      error_type: analysis.error_type,
      cognitive_pattern: analysis.cognitive_pattern,
      snippet: analysis.snippet,
      resolution: analysis.resolution,
      explanation: analysis.detailed_explanation,
      mental_model_flaw: analysis.mental_model_flaw,
    });

    // Update profile stats if exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("bug_dna_stats")
      .eq("id", user.id)
      .single();

    if (profile && profile.bug_dna_stats) {
      const stats = profile.bug_dna_stats as any;
      stats.total_bugs_analyzed = (stats.total_bugs_analyzed || 0) + 1;
      stats.top_traps = stats.top_traps || {};
      stats.top_traps[analysis.cognitive_pattern] =
        (stats.top_traps[analysis.cognitive_pattern] || 0) + 1;

      await supabase
        .from("profiles")
        .update({ bug_dna_stats: stats, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
  } catch (err) {
    console.warn("BugDNA Supabase log sync skipped (unauthenticated or offline):", err);
  }
}

export async function analyzeBugDNAAction(
  codeSnippet: string,
  errorMessage: string,
  context?: string
): Promise<BugDNAAnalysis> {
  const analysis = await analyzeWithBugDNA(codeSnippet, errorMessage, context);
  await persistBugDNA(analysis);
  return analysis;
}

// =========================================================================
// Multi-File Codebase Ingestion & Cross-File Analysis
// =========================================================================

export async function analyzeCodebaseDependenciesAction(
  fileMap: Record<string, string>
): Promise<CodebaseGraph> {
  if (!fileMap || typeof fileMap !== "object" || Object.keys(fileMap).length === 0) {
    throw new Error("fileMap is required");
  }
  return await analyzeCodebaseDependencies(fileMap);
}

export async function analyzeCrossFileBugDNAAction(
  input: CrossFileBugDNAInput
): Promise<CrossFileBugDNAAnalysis> {
  if (!input || typeof input.activeCode !== "string") {
    throw new Error("Active code is required");
  }
  const analysis = await analyzeCrossFileBugDNA(input);
  await persistBugDNA(analysis);
  return analysis;
}

// =========================================================================
// Projects & Workspace Data Actions (Guest vs Authenticated)
// =========================================================================

export async function getUserProjectsAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isGuest: true, projects: [] };
    }

    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, title, description, architecture_graph, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Fetch user projects error:", error);
      return { isGuest: false, projects: [], error: error.message };
    }

    return {
      isGuest: false,
      userId: user.id,
      projects: (projects || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description || "Microservice architecture",
        nodesCount: (p.architecture_graph?.nodes || []).length || 0,
        updatedAt: new Date(p.updated_at).toLocaleDateString(),
      })),
    };
  } catch (err: any) {
    console.warn("Error getting user projects:", err);
    return { isGuest: true, projects: [] };
  }
}

export async function createProjectAction(payload: { title: string; description?: string }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Guest project creation
      const guestId = `project-guest-${Date.now()}`;
      return {
        success: true,
        projectId: guestId,
        isGuest: true,
        project: {
          id: guestId,
          title: payload.title,
          description: payload.description || "",
          architecture_graph: { nodes: [], edges: [] },
        },
      };
    }

    const { data: newProj, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: payload.title.trim(),
        description: payload.description?.trim() || "",
        architecture_graph: { nodes: [], edges: [] },
      })
      .select("id, title, description, architecture_graph")
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      projectId: newProj.id,
      isGuest: false,
      project: newProj,
    };
  } catch (err: any) {
    console.error("Create project error:", err);
    return { success: false, error: err.message };
  }
}

export async function getOrCreateDefaultProjectAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isGuest: true, projectId: "sandbox-demo-1" };
    }

    // Check if user has an existing project
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (projects && projects.length > 0) {
      return { isGuest: false, projectId: projects[0].id };
    }

    // If 0 projects, create a clean initial project
    const { data: newProj, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: "Untitled Architecture Workspace",
        description: "Clean system architecture canvas",
        architecture_graph: { nodes: [], edges: [] },
      })
      .select("id")
      .single();

    if (error) throw error;

    return { isGuest: false, projectId: newProj.id };
  } catch (err: any) {
    console.error("getOrCreateDefaultProjectAction error:", err);
    return { isGuest: true, projectId: "sandbox-demo-1" };
  }
}

export async function getProjectWorkspaceAction(projectId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Authenticated user logic
    if (user) {
      // If an authenticated user lands on sandbox-demo or 'new', resolve to their real project or create clean one
      if (projectId.startsWith("sandbox-demo") || projectId === "new") {
        const { data: existingProjects } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (existingProjects && existingProjects.length > 0) {
          return { isGuest: false, redirectProjectId: existingProjects[0].id };
        } else {
          // Create clean initial project for user
          const { data: cleanProj, error: createError } = await supabase
            .from("projects")
            .insert({
              user_id: user.id,
              title: "Untitled Architecture Workspace",
              description: "Clean system architecture canvas",
              architecture_graph: { nodes: [], edges: [] },
            })
            .select("id")
            .single();

          if (!createError && cleanProj) {
            return { isGuest: false, redirectProjectId: cleanProj.id };
          }
        }
      }

      // Fetch specific user project
      const { data: project, error: projError } = await supabase
        .from("projects")
        .select("id, title, description, architecture_graph, updated_at")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (projError || !project) {
        return { isGuest: false, found: false, error: projError?.message || "Project not found" };
      }

      // Fetch code modules
      const { data: modules } = await supabase
        .from("code_modules")
        .select("node_id, filename, code, language")
        .eq("project_id", projectId);

      const codeModulesMap: Record<string, any> = {};
      if (modules && modules.length > 0) {
        modules.forEach((m: any) => {
          codeModulesMap[m.node_id] = {
            nodeId: m.node_id,
            filename: m.filename,
            code: m.code,
            language: m.language,
          };
        });
      }

      // Fetch BugDNA logs
      const { data: bugLogs } = await supabase
        .from("bug_dna_logs")
        .select("error_type, cognitive_pattern, snippet, resolution, explanation, mental_model_flaw, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch profile stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("bug_dna_stats")
        .eq("id", user.id)
        .single();

      const formattedBugLogs = (bugLogs || []).map((l: any) => ({
        error_type: l.error_type,
        cognitive_pattern: l.cognitive_pattern,
        mental_model_flaw: l.mental_model_flaw || "Logical mental model lapse",
        cognitive_bias: "Cognitive Invariance Lapse",
        preventative_heuristic: "Enforce strict invariants during state transitions.",
        snippet: l.snippet,
        resolution: l.resolution,
        detailed_explanation: l.explanation || "",
        category: "Bounds & Pointers" as const,
        severity: "Medium" as const,
        frequencyRisk: 60,
      }));

      return {
        isGuest: false,
        found: true,
        project,
        codeModules: codeModulesMap,
        bugDnaLogs: formattedBugLogs,
        bugDnaStats: profile?.bug_dna_stats || null,
      };
    }

    // 2. Unauthenticated / Guest Mode logic
    if (projectId.startsWith("sandbox-demo")) {
      return { isGuest: true, found: true };
    }

    return { isGuest: true, found: false };
  } catch (err: any) {
    console.error("getProjectWorkspaceAction error:", err);
    return { isGuest: true, found: false, error: err.message };
  }
}

export async function getUserBugDnaAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isGuest: true, logs: [], stats: null };
    }

    const { data: bugLogs } = await supabase
      .from("bug_dna_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: profile } = await supabase
      .from("profiles")
      .select("bug_dna_stats")
      .eq("id", user.id)
      .single();

    return {
      isGuest: false,
      logs: bugLogs || [],
      stats: profile?.bug_dna_stats || null,
    };
  } catch (err: any) {
    console.error("getUserBugDnaAction error:", err);
    return { isGuest: true, logs: [], stats: null };
  }
}

export async function saveProjectAction(payload: {
  id?: string;
  title: string;
  description?: string;
  architectureGraph: any;
  codeModules?: Record<string, { nodeId: string; filename: string; code: string; language: string }>;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "User not authenticated; state kept in current session." };
    }

    let projectId = payload.id;

    if (projectId && !projectId.startsWith("sandbox-demo")) {
      // 1. Update project record
      const { error: projError } = await supabase
        .from("projects")
        .update({
          title: payload.title,
          description: payload.description,
          architecture_graph: payload.architectureGraph,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("user_id", user.id);

      if (projError) throw projError;

      // 2. Persist code modules if provided (single batched upsert instead of one request per node)
      if (payload.codeModules && Object.keys(payload.codeModules).length > 0) {
        const now = new Date().toISOString();
        const rows = Object.entries(payload.codeModules)
          .filter(([, mod]) => !!mod.code)
          .map(([nodeId, mod]) => ({
            project_id: projectId,
            node_id: nodeId,
            filename: mod.filename || `${nodeId}.ts`,
            code: mod.code,
            language: mod.language || "typescript",
            updated_at: now,
          }));

        if (rows.length > 0) {
          const { error: modError } = await supabase
            .from("code_modules")
            .upsert(rows, { onConflict: "project_id,node_id" });
          if (modError) throw modError;
        }
      }
    } else {
      // Create new project
      const { data: newProj, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: payload.title,
          description: payload.description || "",
          architecture_graph: payload.architectureGraph,
        })
        .select("id")
        .single();

      if (error) throw error;
      projectId = newProj.id;
    }

    return { success: true, projectId };
  } catch (err: any) {
    console.error("Save project error:", err);
    return { success: false, error: err.message };
  }
}