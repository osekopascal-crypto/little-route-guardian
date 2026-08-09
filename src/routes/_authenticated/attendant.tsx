import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { firstName, greeting, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/attendant")({
  head: () => ({
    meta: [
      { title: "Attendant — School Transport" },
      {
        name: "description",
        content: "Bus attendant workspace for recording pupil boarding and alighting.",
      },
      { property: "og:title", content: "Attendant — School Transport" },
      {
        property: "og:description",
        content: "Bus attendant workspace for pupil boarding and alighting.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="attendant">
      <AttendantDashboard />
    </RoleGate>
  ),
});

function AttendantDashboard() {
  const { profile, school } = useAuth();

  return (
    <AppShell
      title={`${greeting()}, ${firstName(profile?.full_name)}`}
      greetingLine={school ? `You're on duty for ${school.name}.` : undefined}
      density="roomy"
    >
      <section className="mx-auto max-w-md space-y-4" aria-labelledby="today">
        <div className="surface-2 animate-rise rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today" className="type-h2">
              Today's Trip
            </h2>
            <StatusPill tone="warning" icon={<Clock className="size-3.5" aria-hidden="true" />}>
              Coming in Phase 4
            </StatusPill>
          </div>
          <p className="type-body-sm mt-3 text-muted-foreground">
            Your assigned bus, route and pupil list will appear here. Boarding and alighting
            will be one large tap per pupil — no typing, no searching.
          </p>

          <div className="route-motif mt-6 space-y-3 rounded-2xl border border-hairline bg-surface-1/60 p-4">
            {[
              { label: "Board pupil", icon: <Users className="size-5" aria-hidden="true" /> },
              {
                label: "Alight pupil",
                icon: <CheckCircle2 className="size-5" aria-hidden="true" />,
              },
            ].map((action) => (
              <div
                key={action.label}
                aria-disabled="true"
                className="flex min-h-16 items-center justify-between rounded-xl border border-dashed border-border bg-background/40 px-5 opacity-70"
              >
                <span className="type-button flex items-center gap-3 text-foreground">
                  {action.icon}
                  {action.label}
                </span>
                <span className="type-label text-muted-foreground">Locked</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-1 animate-rise rounded-2xl p-5" style={{ animationDelay: "80ms" }}>
          <p className="type-label text-muted-foreground">Checklist</p>
          <ul className="mt-3 space-y-2.5">
            {[
              "Your account is active and linked to your school",
              "Boarding records will sync securely to your school only",
              "Trip tools unlock once routes and buses are configured",
            ].map((item) => (
              <li key={item} className="type-body-sm flex gap-3 text-muted-foreground">
                <ClipboardList
                  className="mt-0.5 size-4 shrink-0 text-accent"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
