import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bus, Clock, MapPin, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LiveMap } from "@/components/live-map";
import { RoleGate } from "@/components/role-gate";
import { SkeletonBlock } from "@/components/skeleton-block";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { fullName } from "@/lib/students";
import {
  clockTime,
  etaMinutes,
  journeyPosition,
  riderStatusLabel,
  shortTime,
  tripStatusLabel,
  useBusPositions,
  useMyRiders,
  useRouteStops,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { JourneyRibbon } from "@/routes/_authenticated/parent";

export const Route = createFileRoute("/_authenticated/track/$studentId")({
  head: () => ({
    meta: [
      { title: "Track the bus — School Transport" },
      {
        name: "description",
        content:
          "Watch your child's bus move along the route, see the next stop and how many minutes away it is.",
      },
      { property: "og:title", content: "Track the bus — School Transport" },
      {
        property: "og:description",
        content: "Live bus location, next stop and minutes away for your child's journey.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="parent">
      <TrackChild />
    </RoleGate>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-center">
      {error instanceof Error ? error.message : "Something went wrong."}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">We couldn't find that journey.</div>,
});

function TrackChild() {
  const { studentId } = Route.useParams();
  const riders = useMyRiders();
  const rider = (riders.data ?? []).find((r) => r.student_id === studentId);

  const stops = useRouteStops(rider?.trip.route_id);
  const live = rider?.trip.status === "in_progress";
  const positions = useBusPositions(rider?.trip.id, live);

  const stopList = stops.data ?? [];
  const trail = positions.data ?? [];
  const latest = trail.at(-1) ?? null;
  const myStop = rider?.stop ?? null;
  const nextStop = stopList.find((s) => s.id === rider?.trip.current_stop_id) ?? null;
  const school = stopList.at(-1) ?? null;

  const target = rider?.status === "on_board" ? school : myStop;
  const eta = live ? etaMinutes(latest, target) : null;

  return (
    <AppShell
      title={rider ? fullName(rider.student) : "Journey"}
      greetingLine={
        rider
          ? `${rider.trip.route?.name ?? "Route"} · ${rider.trip.direction === "to_school" ? "Morning run to school" : "Afternoon run home"}`
          : undefined
      }
      density="roomy"
      actions={
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/parent">
            <ArrowLeft className="size-4" aria-hidden="true" />
            My children
          </Link>
        </Button>
      }
    >
      {riders.isLoading ? (
        <SkeletonBlock label="Finding today's journey…" lines={5} />
      ) : !rider ? (
        <EmptyState
          icon={<Bus className="size-6" aria-hidden="true" />}
          title="No journey to follow yet"
          description="Once your school puts your child on a bus run, the live map and updates appear here."
        />
      ) : (
        <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="animate-rise space-y-5">
            <LiveMap
              currentStopId={rider.trip.current_stop_id}
              stops={stopList}
              positions={trail}
              highlightStopId={target?.id ?? null}
              busLabel={rider.trip.bus?.plate_no ?? "Bus"}
              live={live}
            />

            <div className="glass-elevated silk crest p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="type-label text-primary">Right now</p>
                  <h2 className="type-h1 mt-2 text-chrome">{riderStatusLabel[rider.status]}</h2>
                </div>
                <StatusPill tone={live ? "success" : "neutral"}>
                  {tripStatusLabel[rider.trip.status]}
                </StatusPill>
              </div>

              <JourneyRibbon position={journeyPosition(rider)} />

              <div className="mt-7 grid gap-3 border-t border-hairline pt-5 sm:grid-cols-2">
                <div className="glass-soft px-4 py-3.5">
                  <p className="type-meta text-muted-foreground">
                    {rider.status === "on_board" ? "Arriving at school in" : "Bus reaches your stop in"}
                  </p>
                  <p className="type-section mt-1 flex items-center gap-2 text-foreground">
                    <Clock className="size-4 text-accent" aria-hidden="true" />
                    {eta !== null ? `About ${eta} min` : "Waiting for the bus to set off"}
                  </p>
                </div>
                <div className="glass-soft px-4 py-3.5">
                  <p className="type-meta text-muted-foreground">Heading to</p>
                  <p className="type-section mt-1 flex items-center gap-2 text-foreground">
                    <MapPin className="size-4 text-accent" aria-hidden="true" />
                    {nextStop?.name ?? school?.name ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="animate-rise space-y-5" style={{ animationDelay: "80ms" }}>
            <div className="glass-elevated silk crest p-6">
              <h2 className="type-h2 text-chrome">Journey details</h2>
              <dl className="mt-5 space-y-3">
                {[
                  ["Bus", rider.trip.bus ? `${rider.trip.bus.label} · ${rider.trip.bus.plate_no}` : "To be assigned"],
                  ["Your stop", myStop ? myStop.name : "Not set"],
                  [
                    "Scheduled",
                    rider.trip.direction === "to_school"
                      ? (shortTime(myStop?.pickup_time) ?? "—")
                      : (shortTime(myStop?.dropoff_time) ?? "—"),
                  ],
                  ["Boarded", clockTime(rider.boarded_at) ?? "Not yet"],
                  ["Dropped off", clockTime(rider.dropped_at) ?? "Not yet"],
                  ["Last update", clockTime(latest?.recorded_at) ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4">
                    <dt className="type-meta text-muted-foreground">{label}</dt>
                    <dd className="type-body-sm text-right font-semibold text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="glass silk crest p-6">
              <h2 className="type-h2 text-chrome">Stops on this run</h2>
              <ul className="mt-5 space-y-1.5">
                {stopList.map((s) => {
                  const isMine = s.id === myStop?.id;
                  const isNext = s.id === nextStop?.id;
                  return (
                    <li key={s.id} className="flex items-center gap-3.5 rounded-xl px-1 py-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          isNext ? "stop-node" : isMine ? "bg-primary" : "bg-primary/35",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="type-body-sm truncate font-semibold text-foreground">
                          {s.name}
                          {isMine ? " · your stop" : ""}
                        </p>
                        <p className="type-meta text-muted-foreground">
                          {rider.trip.direction === "to_school"
                            ? (shortTime(s.pickup_time) ?? "—")
                            : (shortTime(s.dropoff_time) ?? "—")}
                        </p>
                      </div>
                      {isNext && <StatusPill tone="success">Next</StatusPill>}
                    </li>
                  );
                })}
              </ul>
              <p className="type-caption mt-5 flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
                Only families linked to a pupil on this bus can see this journey.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
