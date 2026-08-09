import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Brand } from "@/components/brand";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { roleLabel, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  greetingLine,
  children,
  density = "comfortable",
}: {
  title: string;
  greetingLine?: string;
  children: React.ReactNode;
  density?: "comfortable" | "roomy";
}) {
  const { profile, school, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/", replace: true });
  }

  const initials = (profile?.full_name ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="atmosphere min-h-screen">
      <header className="sticky top-0 z-20 border-b border-hairline bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand size="sm" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="type-caption font-semibold text-foreground">
                {profile?.full_name}
              </p>
              <p className="type-caption text-muted-foreground">
                {profile ? roleLabel[profile.role] : ""}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full border border-hairline bg-surface-2 text-xs font-bold"
            >
              {initials || "—"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="min-h-9 gap-2"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto max-w-6xl px-4 pb-20 sm:px-6",
          density === "roomy" ? "pt-8 sm:pt-12" : "pt-6 sm:pt-10",
        )}
      >
        <div className="animate-fade">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone="primary" icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}>
              {profile ? roleLabel[profile.role] : "Account"}
            </StatusPill>
            {school && (
              <StatusPill tone="neutral">
                {school.name} · {school.code}
              </StatusPill>
            )}
          </div>
          <h1 className="type-h1 mt-4 text-foreground">{title}</h1>
          {greetingLine && (
            <p className="type-body mt-2 text-muted-foreground">{greetingLine}</p>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
