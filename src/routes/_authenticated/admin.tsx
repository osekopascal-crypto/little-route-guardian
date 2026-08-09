import { createFileRoute } from "@tanstack/react-router";
import { Bus, CalendarClock, Construction, Map, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { firstName, greeting, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — School Transport" },
      {
        name: "description",
        content:
          "Operational control centre for school transport: pupils, buses, routes and daily trips.",
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

  return (
    <AppShell
      title="Admin Dashboard"
      greetingLine={`${greeting()}, ${firstName(profile?.full_name)} — here's ${school?.name ?? "your school"} at a glance.`}
    >
      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          Transport overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard
            label="Students"
            value="—"
            hint="Enrolment arrives in Phase 2"
            icon={<Users className="size-4" />}
            delay={0}
          />
          <KpiCard
            label="Active Buses"
            value="—"
            hint="Fleet arrives in Phase 3"
            icon={<Bus className="size-4" />}
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

      <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-labelledby="foundation">
        <div className="surface-2 animate-rise rounded-2xl p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="foundation" className="type-h2">
              Foundation is live
            </h2>
            <StatusPill tone="success">Phase 1 complete</StatusPill>
          </div>
          <p className="type-body mt-3 text-muted-foreground">
            Secure accounts, school tenancy, roles and protected access are in place. Every
            record created from here onward is isolated to {school?.name ?? "your school"} at
            the database level.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Phase 2", "Students & parent links"],
              ["Phase 3", "Buses, routes & stops"],
              ["Phase 4", "Trips, boarding & alighting"],
              ["Phase 5", "Notifications & reporting"],
            ].map(([phase, label]) => (
              <li
                key={phase}
                className="surface-1 flex items-center justify-between rounded-xl px-4 py-3"
              >
                <span className="type-body-sm text-foreground">{label}</span>
                <span className="type-label text-muted-foreground">{phase}</span>
              </li>
            ))}
          </ul>
        </div>

        <EmptyState
          className="animate-rise"
          icon={<Construction className="size-6" aria-hidden="true" />}
          title="No transport activity yet"
          description="Live trip activity, exceptions and pupil movement will appear here once transport operations are switched on in a later phase."
        />
      </section>
    </AppShell>
  );
}
