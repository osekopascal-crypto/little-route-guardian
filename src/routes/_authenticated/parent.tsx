import { createFileRoute } from "@tanstack/react-router";
import { Bus, Heart, House, MapPin, School } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import { SkeletonBlock } from "@/components/skeleton-block";
import { StatusPill } from "@/components/status-pill";
import { firstName, useAuth } from "@/lib/auth";
import { ageFrom, fullName, initialsOf, relationshipLabel, useMyChildren } from "@/lib/students";
import { cn } from "@/lib/utils";

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
  { label: "Pickup", icon: MapPin },
  { label: "Bus", icon: Bus },
  { label: "School", icon: School },
];

/** Home → Pickup → Bus → School, with the current position highlighted. */
function JourneyRibbon({ position = 0 }: { position?: number }) {
  return (
    <div className="mt-7">
      <ol className="relative flex items-start justify-between gap-1" aria-label="Journey">
        <div
          aria-hidden="true"
          className="route-line absolute left-5 right-5 top-5 -z-0 opacity-80"
        />
        {journey.map((step, i) => {
          const active = i === position;
          const done = i < position;
          return (
            <li key={step.label} className="relative z-10 flex flex-1 flex-col items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-10 place-items-center rounded-full transition-all duration-500",
                  active
                    ? "chip-gradient stop-node scale-110"
                    : done
                      ? "chip-obsidian text-primary"
                      : "glass-soft text-muted-foreground",
                )}
              >
                <step.icon className="size-4" />
              </span>
              <span
                className={cn(
                  "type-meta text-center",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

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
      <section className="mx-auto max-w-md space-y-5" aria-labelledby="children">
        <h2 id="children" className="sr-only">
          My children
        </h2>

        {children.isLoading ? (
          <SkeletonBlock label="Connecting to fleet…" lines={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-6" aria-hidden="true" />}
            title="No children linked yet"
            description="Your school links your children to your account. As soon as that's done, each pupil appears here with their live journey."
          />
        ) : (
          <ul className="space-y-5">
            {list.map((link, i) => {
              const age = ageFrom(link.student.date_of_birth);
              return (
                <li
                  key={link.id}
                  className="scene-3d animate-rise"
                  style={{ animationDelay: `${i * 70}ms` }}
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
                        <h3 className="type-h2 truncate text-foreground">
                          {fullName(link.student)}
                        </h3>
                        <p className="type-meta mt-1 text-muted-foreground">
                          {link.student.admission_no}
                          {link.student.grade_level ? ` · ${link.student.grade_level}` : ""}
                          {age !== null ? ` · ${age} yrs` : ""}
                        </p>
                      </div>
                      <StatusPill tone="neutral">
                        {relationshipLabel[link.relationship]}
                      </StatusPill>
                    </div>

                    <JourneyRibbon position={0} />

                    <p className="type-body-sm mt-7 text-muted-foreground">
                      At home — live pickup and arrival updates begin the moment your school
                      starts a trip.
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
