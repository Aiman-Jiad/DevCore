-- =========================================================
-- DevCore AI: Supabase PostgreSQL Schema & Security Policies
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bug_dna_stats JSONB DEFAULT '{
    "total_bugs_analyzed": 0,
    "top_traps": {
      "Off-by-One Boundary Oversights": 0,
      "Unhandled Async State Race Conditions": 0,
      "Mutation of Shared State Reference": 0,
      "Implicit Type Coercion Blindspot": 0,
      "Premature Optimization Fallacy": 0,
      "Nullish Property Access Neglect": 0
    },
    "cognitive_score": 750
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  architecture_graph JSONB DEFAULT '{
    "nodes": [],
    "edges": []
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Code Modules Table (Code corresponding to Architecture Graph Nodes)
CREATE TABLE IF NOT EXISTS public.code_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  node_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'typescript' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(project_id, node_id)
);

-- 4. BugDNA Logs Table
CREATE TABLE IF NOT EXISTS public.bug_dna_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  cognitive_pattern TEXT NOT NULL,
  snippet TEXT NOT NULL,
  resolution TEXT NOT NULL,
  explanation TEXT,
  mental_model_flaw TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_code_modules_project_id ON public.code_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_code_modules_node_id ON public.code_modules(node_id);
CREATE INDEX IF NOT EXISTS idx_bug_dna_logs_user_id ON public.bug_dna_logs(user_id);

-- =========================================================
-- Row Level Security (RLS) Policies
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_dna_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Code Modules Policies
CREATE POLICY "Users can view code modules of their projects"
  ON public.code_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.code_modules.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert code modules for their projects"
  ON public.code_modules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.code_modules.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update code modules for their projects"
  ON public.code_modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.code_modules.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete code modules for their projects"
  ON public.code_modules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.code_modules.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

-- BugDNA Logs Policies
CREATE POLICY "Users can view their own bug DNA logs"
  ON public.bug_dna_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bug DNA logs"
  ON public.bug_dna_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bug DNA logs"
  ON public.bug_dna_logs FOR DELETE
  USING (auth.uid() = user_id);

-- =========================================================
-- Trigger to Automatically Create Profile on User Signup
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Developer'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
