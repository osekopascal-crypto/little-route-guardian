import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, Heart, House, MapPin, Navigation, School } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import { SkeletonBlock } from "@/components/skeleton-block";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { firstName, useAuth } from "@/lib/auth";
import { ageFrom, fullName, initialsOf, relationshipLabel, useMyChildren } from "@/lib/students";
import { journeyPosition, riderStatusLabel, useMyRiders, type Rider } from "@/lib/tracking";
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
] as const;

/** Human, parent-first status language — never infrastructure language. */
const statusCopy = ["At home", "Waiting for pickup", "On the way", "Arrived safely"] as const;

/** Home → Pickup → Bus → School, with the current position glowing. */
export function JourneyRibbon({ position = 0 }: { position?: number }) {
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
            <li
              key={step.label}
              className="relative z-10 flex flex-1 flex-col items-center gap-2.5"
            >
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
                <step.icon className="size-4" strokeWidth={1.9} />
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
  const riders = useMyRiders();
  const list = children.data ?? [];

  const latestFor = (studentId: string): Rider | undefined =>
    (riders.data ?? []).find((r) => r.student_id === studentId);

  return (
    <AppShell
      title={`Good morning, ${firstName(profile?.full_name)}`}
      greetingLine={school ? `Here's how your family's journeys look today.` : undefined}
      density="roomy"
    >
      <section className="mx-auto max-w-md space-y-5" aria-labelledby="children">
        <h2 id="children" className="type-label text-muted-foreground">
          My children
        </h2>

        {children.isLoading ? (
          <SkeletonBlock label="Bringing in today's journeys…" lines={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Heart className="size-6" aria-hidden="true" />}
            title="No children linked yet"
            description="Your school links your children to your account. As soon as that's done, each pupil appears here with their journey."
          />
        ) : (
          <ul className="space-y-5">
            {list.map((link, i) => {
              const age = ageFrom(link.student.date_of_birth);
              const rider = latestFor(link.student_id);
              const position = rider ? journeyPosition(rider) : 0;
              const onTheRoad = rider?.trip.status === "in_progress";
              return (
                <li
                  key={link.id}
                  className="scene-3d animate-rise"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="glass-elevated silk crest lift-3d edge-lit p-6">
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

                    <JourneyRibbon position={position} />

                    <div className="mt-7 flex items-center justify-between gap-3 border-t border-hairline pt-5">
                      <div className="min-w-0">
                        <p className="type-section text-foreground">
                          {rider ? riderStatusLabel[rider.status] : statusCopy[position]}
                        </p>
                        <p className="type-meta text-muted-foreground">
                          {rider
                            ? `${rider.trip.route?.name ?? "Route"} · ${rider.trip.bus?.label ?? "Bus to be assigned"}`
                            : "Updates begin when the bus sets off"}
                        </p>
                      </div>
                      {onTheRoad && (
                        <StatusPill tone="success">Live</StatusPill>
                      )}
                    </div>

                    {rider && (
                      <Button asChild className="type-button mt-5 min-h-12 w-full rounded-xl">
                        <Link to="/track/$studentId" params={{ studentId: link.student_id }}>
                          <Navigation className="size-4" aria-hidden="true" />
                          Track the bus
                        </Link>
                      </Button>
                    )}
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
