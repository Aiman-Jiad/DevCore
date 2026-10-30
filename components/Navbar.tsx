"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Cpu,
  Dna,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Zap,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    async function loadUser() {
      try {
        if (!isConfigured) {
          // Check local preview session
          const localUser = localStorage.getItem("devcore_guest_user");
          if (localUser) {
            setUser(JSON.parse(localUser));
          }
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "developer@devcore.ai",
            fullName:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Principal Architect",
            avatarUrl:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              "",
          });
        } else {
          const localUser = localStorage.getItem("devcore_guest_user");
          if (localUser) {
            setUser(JSON.parse(localUser));
          }
        }
      } catch (err) {
        console.warn("Auth session check:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    if (isConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            fullName:
              session.user.user_metadata?.full_name ||
              session.user.email?.split("@")[0] ||
              "Engineer",
            avatarUrl: session.user.user_metadata?.avatar_url || "",
          });
        } else {
          const localUser = localStorage.getItem("devcore_guest_user");
          setUser(localUser ? JSON.parse(localUser) : null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isConfigured, supabase.auth]);

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      // Set quick guest profile for seamless instant preview
      const demoUser: UserProfile = {
        id: "demo-engineer-01",
        email: "alex.chen@googlemail.com",
        fullName: "Alex Chen (Staff Architect)",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      };
      localStorage.setItem("devcore_guest_user", JSON.stringify(demoUser));
      setUser(demoUser);
      router.push("/dashboard");
      return;
    }

    const redirectUrl = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  const handleLogout = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("devcore_guest_user");
    setUser(null);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-400 text-zinc-950 font-black shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-all">
              <Zap className="h-4 w-4 fill-zinc-950 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white text-base leading-none">
                DevCore<span className="text-cyan-400">.AI</span>
              </span>
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-mono">
                Unified Engineering Hub
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href={user ? "/dashboard/workspace" : "/dashboard/project/sandbox-demo-1"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                pathname?.includes("/project") || pathname?.includes("/workspace")
                  ? "bg-zinc-800/80 text-cyan-400 border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Boxes className="h-3.5 w-3.5 text-cyan-400" />
              <span>Workspace</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                pathname === "/dashboard"
                  ? "bg-zinc-800/80 text-cyan-400 border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
              <span>Projects & BugDNA</span>
            </Link>
          </nav>
        </div>

        {/* Status Indicators & Auth */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px]">
            <Badge variant="cyan" className="gap-1 py-0 px-2 font-mono">
              <Sparkles className="h-3 w-3 text-cyan-300 animate-pulse" />
              Gemini 2.5
            </Badge>
            <Badge variant={isConfigured ? "emerald" : "outline"} className="gap-1 py-0 px-2 font-mono">
              <span className={`h-1.5 w-1.5 rounded-full ${isConfigured ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
              {isConfigured ? "Supabase Live" : "Local Sandbox"}
            </Badge>
          </div>

          {loading ? (
            <div className="h-8 w-24 bg-zinc-800/60 animate-pulse rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Badge variant="emerald" className="hidden sm:inline-flex font-mono text-[10px] py-0 px-2">
                User Mode
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-cyan-500/50 transition-all outline-none">
                    <Avatar className="h-8 w-8 border border-cyan-500/40">
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                      <AvatarFallback className="bg-zinc-800 text-cyan-300 font-bold text-xs">
                        {user.fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-zinc-100">{user.fullName}</p>
                      <p className="text-xs text-zinc-400 truncate font-mono">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-emerald-400" />
                      <span>Projects Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/workspace" className="cursor-pointer flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-cyan-400" />
                      <span>Active Workspace</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/project/sandbox-demo-1" className="cursor-pointer flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-zinc-400" />
                      <span>Presentation Demo</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard#bug-dna" className="cursor-pointer flex items-center gap-2">
                      <Dna className="h-4 w-4 text-violet-400" />
                      <span>BugDNA Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:text-red-300">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Log out (Switch to Guest)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px] text-zinc-400 border-zinc-800">
                Guest Mode
              </Badge>
              <Button
                onClick={handleGoogleSignIn}
                variant="neon"
                size="sm"
                className="gap-2 font-mono text-xs"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
