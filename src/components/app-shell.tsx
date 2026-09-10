import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bus,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Route as RouteIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Brand } from "@/components/brand";
import { Environment } from "@/components/environment";
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
    <div className="atmosphere relative flex min-h-screen flex-col overflow-x-hidden">
      <Environment />

      <header className="glass-nav crest sticky top-0 z-20">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Brand size="sm" />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="type-caption truncate font-semibold text-foreground">
                {profile?.full_name}
              </p>
              <p className="type-meta text-muted-foreground">
                {profile ? roleLabel[profile.role] : ""}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="chip-gradient grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold"
            >
              {initials || "—"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="min-h-9 shrink-0 gap-2"
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
                className="type-nav glass-soft flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-muted-foreground transition-all duration-300 hover:text-foreground data-[status=active]:chip-gradient data-[status=active]:text-primary-foreground"
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
          "relative mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6",
          density === "roomy" ? "pt-9 sm:pt-14" : "pt-8 sm:pt-12",
        )}
      >
        <div className="animate-fade">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusPill
              tone="primary"
              icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
            >
              {profile ? roleLabel[profile.role] : "Account"}
            </StatusPill>
            {school && (
              <StatusPill tone="neutral">
                {school.name} · {school.code}
              </StatusPill>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="type-h1 text-chrome">{title}</h1>
              {greetingLine && (
                <p className="type-body mt-2.5 max-w-xl text-muted-foreground">{greetingLine}</p>
              )}
              <div aria-hidden="true" className="route-line mt-5 w-40 opacity-80" />
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
        <div className="mt-10">{children}</div>
      </main>

      <footer className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <p className="type-meta text-muted-foreground">
            School Transport · Safe journeys, every day
          </p>
          <p className="type-meta text-muted-foreground">
            Powered by <span className="font-display font-semibold text-foreground">Pasco Labs</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
