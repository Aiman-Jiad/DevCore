# DevCore AI — Unified Engineering Hub

**DevCore AI** is a modern SaaS engineering hub integrating:
1. **Architecture Sandbox (Macro View):** AI visual system architecture designer with drag-and-drop nodes using React Flow (`@xyflow/react`) and Gemini 2.5 Flash.
2. **Interactive Algorithmic Visualizer (Micro View):** Code runner and step-by-step dynamic execution state machine with Monaco Editor and dynamic memory heap & pointer animations.
3. **BugDNA Engine (Cognitive Layer):** Cognitive debugger tracking recurring logical traps and mental model flaws with Gemini 2.5 Pro to build a personalized developer skill profile.

---

## ⚡ Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Tailwind CSS, Shadcn UI components).
- **Diagramming & Visuals:** React Flow (`@xyflow/react`), Lucide Icons.
- **Code Editor:** Monaco Editor (`@monaco-editor/react`).
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth with Google OAuth 2.0 Provider, Row Level Security).
- **AI Engine:** Google Gemini API via official `@google/genai` SDK (`gemini-2.5-flash` for high-speed node generation & code parsing, `gemini-2.5-pro` for deep BugDNA cognitive profiling).
- **State Management:** Zustand (`useWorkspaceStore`).

---

## 🚀 Quick Start

### 1. Install Dependencies
Dependencies are already installed in your workspace. If needed:
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Add your credentials in `.env.local`:
```env
# Supabase Configuration (from supabase.com -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini API Key (from https://aistudio.google.com)
GEMINI_API_KEY=your-gemini-api-key-here

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** DevCore AI comes with high-fidelity deterministic fallbacks and local preview sessions enabled, allowing you to launch and test the entire UI immediately before adding API keys!

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup (Supabase)

1. Open your project on [supabase.com](https://supabase.com).
2. Go to the **SQL Editor**.
3. Open `supabase/schema.sql` from this repository.
4. Copy and paste the entire SQL script and execute it:
   - Creates `profiles`, `projects`, `code_modules`, and `bug_dna_logs` tables.
   - Sets up strict Row-Level Security (RLS) policies allowing users to CRUD only their own rows.
   - Installs the `handle_new_user()` trigger to automatically create developer profiles upon OAuth sign-in.

---

## 🔑 Google OAuth Setup (Supabase)

1. Go to **Google Cloud Console** -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Set Authorized Redirect URI:
   ```
   https://<your-supabase-project-id>.supabase.co/auth/v1/callback
   ```
4. Copy your **Client ID** and **Client Secret**.
5. In Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**:
   - Enable Google provider.
   - Paste Client ID and Client Secret.
   - Save.

---

## 🧩 Features Walkthrough

### 1. Architecture Sandbox (Macro View)
- Accessible from `/dashboard/project/[id]`.
- Enter any concept in the prompt bar:
  - *"Distributed video transcoding pipeline with S3, Redis cache, RabbitMQ queue, and Auth service."*
- Click **Generate** to invoke `gemini-2.5-flash`.
- Generates distributed nodes with live metrics (RPS, latency, CPU) and edge topologies.
- Click any node to instantly view its code implementation in the Monaco editor.
- Add manual nodes, auto-fit view, or export full architecture JSON blueprints.

### 2. Interactive Algorithmic Visualizer (Micro View)
- Embedded Monaco Editor with dark engineer theme and TypeScript syntax highlighting.
- Algorithm presets:
  - *Two Pointers (Sorted Two-Sum)*
  - *Binary Search*
  - *Off-by-One Loop Flaw*
  - *Async Race Condition*
- Click **Run & Visualize** to invoke `gemini-2.5-flash`.
- Step through execution frames with forward/backward/play controls and variable speed (0.5x, 1x, 2x).
- Visualizes array memory heap with glowing index pointers, live stack registers, and call stack frames.

### 3. BugDNA Engine (Cognitive Layer)
- When a code snippet encounters a boundary violation or unexpected state, click **Analyze with BugDNA**.
- Calls `gemini-2.5-pro` to diagnose the underlying cognitive trap and mental model flaw:
  - *Off-by-One Boundary Oversights*
  - *Unhandled Async State Race Conditions*
  - *Mutation of Shared State Reference*
  - *Implicit Type Coercion Blindspot*
  - *Premature Optimization Fallacy*
- Displays personalized radar bars with percentage distributions, cognitive resilience scores, and preventative invariant heuristics.
