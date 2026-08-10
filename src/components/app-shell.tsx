import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";

import { Brand } from "@/components/brand";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { roleLabel, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navByRole = {
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/students", label: "Pupils", icon: Users },
  ],
  attendant: [{ to: "/attendant", label: "Today", icon: LayoutDashboard }],
  parent: [{ to: "/parent", label: "My children", icon: Users }],
} as const;

export function AppShell({
  title,
  greetingLine,
  actions,
  children,
  density = "comfortable",
}: {
  title: string;
  greetingLine?: string | undefined;
  actions?: React.ReactNode;
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

  const nav = profile ? navByRole[profile.role] : [];

  return (
    <div className="atmosphere relative min-h-screen overflow-x-hidden">
      {/* Ambient depth */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-8rem] top-[-6rem] size-[26rem] bg-primary/25" />
        <div
          className="orb right-[-10rem] top-[6rem] size-[22rem] bg-accent/20"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <header className="sticky top-0 z-20 border-b border-hairline bg-background/60 backdrop-blur-2xl">
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
              className="chip-gradient grid size-9 place-items-center rounded-full text-xs font-bold"
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

        {nav.length > 1 && (
          <nav
            aria-label="Sections"
            className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6"
          >
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="type-nav glass-soft flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:chip-gradient data-[status=active]:text-primary-foreground"
                activeOptions={{ exact: true }}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main
        className={cn(
          "relative mx-auto max-w-6xl px-4 pb-24 sm:px-6",
          density === "roomy" ? "pt-8 sm:pt-12" : "pt-6 sm:pt-10",
        )}
      >
        <div className="animate-fade">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusPill tone="primary" icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}>
              {profile ? roleLabel[profile.role] : "Account"}
            </StatusPill>
            {school && (
              <StatusPill tone="neutral">
                {school.name} · {school.code}
              </StatusPill>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="type-h1 text-chrome">{title}</h1>
              {greetingLine && (
                <p className="type-body mt-2 text-muted-foreground">{greetingLine}</p>
              )}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
