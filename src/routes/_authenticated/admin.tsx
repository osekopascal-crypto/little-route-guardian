import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bus, CalendarClock, Map, ShieldCheck, UserRound, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { firstName, greeting, useAuth } from "@/lib/auth";
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard
            label="Pupils"
            value={dash(list.length)}
            hint={`${dash(active)} active on the register`}
            icon={<Users className="size-4" />}
            delay={0}
          />
          <KpiCard
            label="Parent accounts"
            value={parents.isLoading ? "—" : String(parents.data?.length ?? 0)}
            hint={`${unlinked.length} pupils await a family link`}
            icon={<UserRound className="size-4" />}
            delay={60}
          />
          <KpiCard
            label="Routes"
            value="—"
            hint="Routes & stops arrive in Phase 3"
            icon={<Map className="size-4" />}
            delay={120}
          />
          <KpiCard
            label="Today's Trips"
            value="—"
            hint="Live trips arrive in Phase 4"
            icon={<CalendarClock className="size-4" />}
            delay={180}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-labelledby="register">
        <div className="scene-3d animate-rise lg:col-span-2">
          <div className="glass lift-3d edge-lit h-full p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="register" className="type-h2 text-chrome">
                Newest pupils
              </h2>
              <StatusPill tone="success">Phase 2 live</StatusPill>
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
          <div className="glass lift-3d edge-lit h-full p-6">
            <div
              aria-hidden="true"
              className="chip-gradient float-y grid size-12 place-items-center rounded-2xl"
            >
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="type-h3 mt-5 text-foreground">Roadmap</h2>
            <ul className="mt-4 space-y-2">
              {[
                ["Phase 1", "Accounts & tenancy", "done"],
                ["Phase 2", "Pupils & families", "done"],
                ["Phase 3", "Buses, routes & stops", "next"],
                ["Phase 4", "Trips & boarding", "later"],
              ].map(([phase, label, state]) => (
                <li
                  key={phase}
                  className="glass-soft flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="type-body-sm text-foreground">{label}</span>
                  <StatusPill
                    tone={state === "done" ? "success" : state === "next" ? "info" : "neutral"}
                  >
                    {phase}
                  </StatusPill>
                </li>
              ))}
            </ul>
            <p className="type-caption mt-4 flex items-center gap-2 text-muted-foreground">
              <Bus className="size-4 text-accent" aria-hidden="true" />
              Fleet and live tracking unlock next.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
