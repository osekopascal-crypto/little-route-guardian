import { createFileRoute } from "@tanstack/react-router";
import { Bus, Heart, House, School } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { firstName, useAuth } from "@/lib/auth";
import { ageFrom, fullName, initialsOf, relationshipLabel, useMyChildren } from "@/lib/students";

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
  { label: "Home", icon: House, caption: "Pick-up point" },
  { label: "On the way", icon: Bus, caption: "In transit with the bus attendant" },
  { label: "School", icon: School, caption: "Arrival confirmation" },
];

function ParentDashboard() {
  const { profile, school } = useAuth();
  const children = useMyChildren();
  const list = children.data ?? [];

  return (
    <AppShell
      title={`Welcome, ${firstName(profile?.full_name)}`}
      greetingLine={school ? `Your family's journeys at ${school.name}.` : undefined}
      density="roomy"
    >
      <section className="mx-auto max-w-md space-y-4" aria-labelledby="children">
        <h2 id="children" className="sr-only">
          My children
        </h2>

        {children.isLoading ? (
          <div className="glass h-32 animate-pulse opacity-60" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-6" aria-hidden="true" />}
            title="No children linked yet"
            description="Your school links your children to your account. As soon as that's done, each pupil will appear here with their journey status."
          />
        ) : (
          <ul className="space-y-4">
            {list.map((link, i) => {
              const age = ageFrom(link.student.date_of_birth);
              return (
                <li
                  key={link.id}
                  className="scene-3d animate-rise"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="glass lift-3d edge-lit sheen p-6">
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden="true"
                        className="chip-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-bold"
                      >
                        {initialsOf(link.student)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="type-h3 truncate text-foreground">
                          {fullName(link.student)}
                        </h3>
                        <p className="type-caption text-muted-foreground">
                          {link.student.admission_no}
                          {link.student.grade_level ? ` · ${link.student.grade_level}` : ""}
                          {age !== null ? ` · ${age} yrs` : ""}
                        </p>
                      </div>
                      <StatusPill tone="info">
                        {relationshipLabel[link.relationship]}
                      </StatusPill>
                    </div>

                    <ol className="mt-6 space-y-4" aria-label="Journey stages">
                      {journey.map((step) => (
                        <li key={step.label} className="flex items-center gap-4">
                          <span
                            aria-hidden="true"
                            className="glass-soft grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground"
                          >
                            <step.icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="type-body-sm text-foreground">{step.label}</p>
                            <p className="type-caption text-muted-foreground">{step.caption}</p>
                          </div>
                          <StatusPill tone="neutral">Awaiting data</StatusPill>
                        </li>
                      ))}
                    </ol>

                    <p className="type-caption mt-5 text-muted-foreground">
                      Live boarding and arrival times switch on when your school starts
                      recording trips.
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
