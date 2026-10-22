import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  Map,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";


import { AppShell } from "@/components/app-shell";
import { FleetMap, UpcomingStops } from "@/components/fleet-map";
import { KpiCard } from "@/components/kpi-card";
import { SubscriptionCard } from "@/components/subscription-card";

import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { firstName, greeting, useAuth } from "@/lib/auth";
import { kindLabel, useIncidents } from "@/lib/incidents";
import { timeAgo } from "@/lib/notifications";
import { useTodayTrips } from "@/lib/tracking";
import {
  fullName,
  initialsOf,
  useGuardianLinks,
  useParentOptions,
  useStudents,
} from "@/lib/students";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — School Transport" },
      {
        name: "description",
        content:
          "Operational control centre for school transport: pupils, families, buses, routes and daily trips.",
      },
      { property: "og:title", content: "Admin Dashboard — School Transport" },
      {
        property: "og:description",
        content: "Operational control centre for school transport.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminDashboard />
    </RoleGate>
  ),
});

function AdminDashboard() {
  const { profile, school } = useAuth();
  const students = useStudents();
  const links = useGuardianLinks();
  const parents = useParentOptions();
  const trips = useTodayTrips();
  const incidents = useIncidents();
  const openIncidents = (incidents.data ?? []).filter((i) => i.status === "open");
  const board = trips.data ?? [];
  const onRoad = board.filter((t) => t.status === "in_progress").length;
  const routeCount = new Set(board.map((t) => t.route_id)).size;


  const list = students.data ?? [];
  const active = list.filter((s) => s.status === "active").length;
  const linkedIds = new Set((links.data ?? []).map((l) => l.student_id));
  const unlinked = list.filter((s) => !linkedIds.has(s.id));
  const recent = [...list]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const dash = (v: number) => (students.isLoading ? "—" : String(v));

  return (
    <AppShell
      title="Admin Dashboard"
      greetingLine={`${greeting()}, ${firstName(profile?.full_name)} — here's ${school?.name ?? "your school"} at a glance.`}
      actions={
        <Button asChild className="min-h-11 gap-2">
          <Link to="/students">
            Manage pupils
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          Transport overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
          <KpiCard
            className="lg:col-span-2"
            emphasis="primary"
            live
            label="Pupils on the register"
            value={dash(list.length)}
            hint={`${dash(active)} active · isolated to ${school?.code ?? "your school"}`}
            icon={<Users className="size-4" />}
            delay={0}
          />
          <KpiCard
            label="Parent accounts"
            value={parents.isLoading ? "—" : String(parents.data?.length ?? 0)}
            hint={`${unlinked.length} pupils await a family link`}
            icon={<UserRound className="size-4" />}
            delay={80}
          />
          <KpiCard
            emphasis="quiet"
            label="Routes running today"
            value={trips.isLoading ? "—" : String(routeCount)}
            hint="Corridors with a scheduled run"
            icon={<Map className="size-4" />}
            delay={140}
          />
          <KpiCard
            emphasis="quiet"
            live
            label="Today's trips"
            value={trips.isLoading ? "—" : String(board.length)}
            hint={`${onRoad} on the road right now`}
            icon={<CalendarClock className="size-4" />}
            delay={200}
          />
        </div>
      </section>

      <SubscriptionCard />

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_1fr]" aria-label="Live fleet">
        <div className="animate-rise">
          <FleetMap />
        </div>
        <div className="animate-rise" style={{ animationDelay: "80ms" }}>
          <UpcomingStops />
        </div>
      </section>


      <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-labelledby="register">
        <div className="scene-3d animate-rise lg:col-span-2">
          <div className="glass-elevated silk crest lift-3d edge-lit h-full p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="register" className="type-h2 text-chrome">
                Newest pupils
              </h2>
              <StatusPill tone="success">Register live</StatusPill>
            </div>


            {recent.length === 0 ? (
              <p className="type-body mt-4 text-muted-foreground">
                No pupils yet. Add your first pupil to start the register — everything you
                create stays isolated to {school?.name ?? "your school"}.
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {recent.map((s) => (
                  <li key={s.id} className="glass-soft flex items-center gap-3 px-4 py-3">
                    <span
                      aria-hidden="true"
                      className="chip-gradient grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold"
                    >
                      {initialsOf(s)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="type-body-sm truncate text-foreground">{fullName(s)}</p>
                      <p className="type-caption text-muted-foreground">
                        {s.admission_no}
                        {s.grade_level ? ` · ${s.grade_level}` : ""}
                      </p>
                    </div>
                    <StatusPill tone={linkedIds.has(s.id) ? "info" : "warning"}>
                      {linkedIds.has(s.id) ? "Family linked" : "No parent"}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            )}

            <Button asChild variant="ghost" className="mt-5 gap-2">
              <Link to="/students">
                Open pupil register
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="scene-3d animate-rise" style={{ animationDelay: "80ms" }}>
          <div className="glass-elevated silk crest lift-3d edge-lit h-full p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-h2 text-chrome">Alerts</h2>
              <StatusPill tone={openIncidents.length ? "warning" : "success"}>
                {openIncidents.length ? `${openIncidents.length} open` : "All clear"}
              </StatusPill>
            </div>
            {openIncidents.length === 0 ? (
              <p className="type-body-sm mt-5 text-muted-foreground">
                No open incidents. Reports from bus attendants will appear here.
              </p>
            ) : (
            <ul className="mt-5 space-y-2.5">
              {openIncidents.slice(0, 4).map((a) => (
                <li key={a.id} className="glass-soft flex items-start gap-3 px-4 py-3.5">
                  <TriangleAlert
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      a.severity === "high" ? "text-destructive" : "text-warning",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="type-body-sm font-semibold text-foreground">{kindLabel[a.kind]}</p>
                    <p className="type-meta line-clamp-2 text-muted-foreground">
                      {a.description} · {timeAgo(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            )}
            <Button asChild variant="ghost" className="mt-3 gap-2">
              <Link to="/incidents">
                All incidents
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <div aria-hidden="true" className="route-line mt-6 w-full opacity-70" />
            <p className="type-caption mt-5 flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
              Every record here stays isolated to {school?.code ?? "your school"}.
            </p>
          </div>

        </div>
      </section>
    </AppShell>
  );
}
