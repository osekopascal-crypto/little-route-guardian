import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, MapPin } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { firstName, greeting, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

/** Preview roster — real trips arrive with the trips module. */
const roster = ["Zawadi Mwangi", "Brian Kamau", "Mary Njeri", "Kevin Otieno", "Sarah Wanjiku"];

function AttendantDashboard() {
  const { profile, school } = useAuth();
  const [boarded, setBoarded] = useState<string[]>([]);

  const toggle = (name: string) =>
    setBoarded((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <AppShell
      title={`${greeting()}, ${firstName(profile?.full_name)}`}
      greetingLine={school ? `You're on duty for ${school.name}.` : undefined}
      density="roomy"
    >
      <section className="mx-auto max-w-md space-y-4" aria-labelledby="today">
        <div className="glass-elevated silk crest animate-rise p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="type-label text-primary">Morning trip</p>
              <h2 id="today" className="type-h1 mt-2 text-chrome">
                Bus 07
              </h2>
              <p className="type-body-sm mt-2 flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-accent" aria-hidden="true" />
                Kiambu Stage · Kiambu Road
              </p>
            </div>
            <StatusPill tone="warning" icon={<Clock className="size-3.5" aria-hidden="true" />}>
              Preview
            </StatusPill>
          </div>

          <div aria-hidden="true" className="route-line mt-6 w-full" />

          <p className="type-section mt-6 text-foreground">
            {boarded.length} of {roster.length} pupils on board
          </p>

          <ul className="mt-4 space-y-2.5">
            {roster.map((name) => {
              const on = boarded.includes(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(name)}
                    className={cn(
                      "tap-target flex w-full items-center gap-4 border px-5 text-left",
                      on
                        ? "border-primary/50 bg-primary/12"
                        : "border-hairline bg-surface-1/70 hover:bg-surface-1",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                        on
                          ? "chip-gradient border-transparent"
                          : "border-border bg-background/50 text-muted-foreground",
                      )}
                    >
                      {on ? <Check className="size-5" strokeWidth={2.4} /> : null}
                    </span>
                    <span className="type-button min-w-0 flex-1 truncate text-foreground">
                      {name}
                    </span>
                    <span className="type-meta shrink-0 text-muted-foreground">
                      {on ? "On board" : "Waiting"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Button disabled className="type-button mt-6 min-h-14 w-full rounded-xl">
            Confirm stop
          </Button>
          <p className="type-caption mt-3 text-center text-muted-foreground">
            Confirming stops goes live once your school configures buses and routes.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
