import { createFileRoute } from "@tanstack/react-router";
import { Bus, Heart, House, School } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { firstName, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({
    meta: [
      { title: "Parent — School Transport" },
      {
        name: "description",
        content: "Follow your child's school transport journey with calm, clear updates.",
      },
      { property: "og:title", content: "Parent — School Transport" },
      {
        property: "og:description",
        content: "Follow your child's school transport journey with calm, clear updates.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="parent">
      <ParentDashboard />
    </RoleGate>
  ),
});

const journey = [
  { label: "Home", icon: House },
  { label: "On the way", icon: Bus },
  { label: "School", icon: School },
];

function ParentDashboard() {
  const { profile, school } = useAuth();

  return (
    <AppShell
      title={`Welcome, ${firstName(profile?.full_name)}`}
      greetingLine={
        school ? `You'll follow journeys for ${school.name} here.` : undefined
      }
      density="roomy"
    >
      <section className="mx-auto max-w-md space-y-4" aria-labelledby="journey">
        <div className="surface-2 animate-rise rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="journey" className="type-h2">
              Journey timeline
            </h2>
            <StatusPill tone="info">Preview</StatusPill>
          </div>
          <p className="type-body-sm mt-3 text-muted-foreground">
            When transport tracking goes live, your child's status will appear here within
            seconds of the attendant recording it.
          </p>

          <ol className="mt-6 space-y-4" aria-label="Example journey stages">
            {journey.map((step, index) => (
              <li key={step.label} className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-hairline bg-surface-1 text-muted-foreground"
                >
                  <step.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="type-h3 text-foreground">{step.label}</p>
                  <p className="type-caption text-muted-foreground">
                    {index === 0
                      ? "Pick-up point"
                      : index === 1
                        ? "In transit with the bus attendant"
                        : "Arrival confirmation"}
                  </p>
                </div>
                <StatusPill tone="neutral">Awaiting data</StatusPill>
              </li>
            ))}
          </ol>
        </div>

        <EmptyState
          className="animate-rise"
          icon={<Heart className="size-6" aria-hidden="true" />}
          title="No children linked yet"
          description="Your school will link your children to your account. Once transport tracking launches, you'll see each pupil's boarding time and journey status here."
        />
      </section>
    </AppShell>
  );
}
