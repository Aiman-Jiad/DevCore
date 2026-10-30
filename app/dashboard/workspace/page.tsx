"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDefaultProjectAction } from "@/app/actions";
import { Loader2 } from "lucide-react";

export default function WorkspaceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function resolveTargetWorkspace() {
      try {
        const res = await getOrCreateDefaultProjectAction();
        if (res.projectId) {
          router.replace(`/dashboard/project/${res.projectId}`);
        } else {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("Workspace redirect error:", err);
        router.replace("/dashboard/project/sandbox-demo-1");
      }
    }

    resolveTargetWorkspace();
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
        <span>Resolving active engineering workspace...</span>
      </div>
    </div>
  );
}
