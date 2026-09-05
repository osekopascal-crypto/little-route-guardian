import { createFileRoute } from "@tanstack/react-router";
import { Bus, Check, CircleSlash, MapPin, Navigation, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LiveMap } from "@/components/live-map";
import { RoleGate } from "@/components/role-gate";
import { SkeletonBlock } from "@/components/skeleton-block";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { firstName, greeting, useAuth } from "@/lib/auth";
import { fullName } from "@/lib/students";
import {
  clockTime,
  shortTime,
  tripStatusLabel,
  useAttendantTrip,
  useBusPositions,
  useRouteStops,
  useSetRiderStatus,
  useSharePosition,
  useTripManifest,
  useUpdateTrip,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendant")({
  head: () => ({
    meta: [
      { title: "Attendant — School Transport" },
      {
        name: "description",
        content: "Run today's bus trip: board pupils, advance stops and share the bus location.",
      },
      { property: "og:title", content: "Attendant — School Transport" },
      {
        property: "og:description",
        content: "Board pupils, advance stops and share the live bus location.",
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
  const trip = useAttendantTrip(profile?.id);
  const t = trip.data ?? null;
  const stops = useRouteStops(t?.route_id);
  const manifest = useTripManifest(t?.id);
  const positions = useBusPositions(t?.id, t?.status === "in_progress");
  const setStatus = useSetRiderStatus();
  const updateTrip = useUpdateTrip();
  const share = useSharePosition();
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef<number | null>(null);

  const stopList = stops.data ?? [];
  const rows = manifest.data ?? [];
  const onBoard = rows.filter((r) => r.status === "on_board").length;
  const currentIndex = stopList.findIndex((s) => s.id === t?.current_stop_id);
  const nextStop = stopList[currentIndex + 1] ?? null;

  // Share this device's GPS as the bus position while the trip is running.
  useEffect(() => {
    if (!sharing || !t || !school) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        share.mutate({
          tripId: t.id,
          busId: t.bus_id,
          schoolId: school.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speedKph: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null,
          heading: pos.coords.heading ?? null,
        });
      },
      () => setSharing(false),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    watchRef.current = id;
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing, t?.id, school?.id]);

  return (
    <AppShell
      title={`${greeting()}, ${firstName(profile?.full_name)}`}
      greetingLine={school ? `You're on duty for ${school.name}.` : undefined}
      density="roomy"
    >
      {trip.isLoading ? (
        <SkeletonBlock label="Loading your trip…" lines={4} />
      ) : !t ? (
        <EmptyState
          icon={<Bus className="size-6" aria-hidden="true" />}
          title="No trip assigned yet"
          description="Your school office assigns you a bus and route. Once that's done, today's run and its pupil list appear here."
        />
      ) : (
        <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_1.05fr]">
          <div className="animate-rise space-y-5">
            <div className="glass-elevated silk crest p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="type-label text-primary">
                    {t.direction === "to_school" ? "Morning run" : "Afternoon run"}
                  </p>
                  <h2 className="type-h1 mt-2 text-chrome">
                    {t.bus?.label ?? "Bus to be assigned"}
                  </h2>
                  <p className="type-body-sm mt-2 flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4 shrink-0 text-accent" aria-hidden="true" />
                    {t.route?.name ?? "Route"}
                    {t.bus ? ` · ${t.bus.plate_no}` : ""}
                  </p>
                </div>
                <StatusPill tone={t.status === "in_progress" ? "success" : "neutral"}>
                  {tripStatusLabel[t.status]}
                </StatusPill>
              </div>

              <div aria-hidden="true" className="route-line mt-6 w-full" />

              <p className="type-section mt-6 text-foreground">
                {onBoard} of {rows.length} pupils on board
              </p>
              <p className="type-meta mt-1 text-muted-foreground">
                Started {clockTime(t.started_at) ?? "—"} · heading to{" "}
                {stopList[currentIndex]?.name ?? nextStop?.name ?? "school"}
              </p>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {t.status === "planned" ? (
                  <Button
                    className="type-button min-h-14 w-full rounded-xl sm:col-span-2"
                    disabled={updateTrip.isPending}
                    onClick={() =>
                      updateTrip.mutate({
                        id: t.id,
                        patch: {
                          status: "in_progress",
                          started_at: new Date().toISOString(),
                          current_stop_id: stopList[0]?.id ?? null,
                        },
                      })
                    }
                  >
                    <Play className="size-4" aria-hidden="true" />
                    Start the trip
                  </Button>
                ) : t.status === "in_progress" ? (
                  <>
                    <Button
                      variant="secondary"
                      className="type-button min-h-14 w-full rounded-xl"
                      disabled={!nextStop || updateTrip.isPending}
                      onClick={() =>
                        nextStop &&
                        updateTrip.mutate({ id: t.id, patch: { current_stop_id: nextStop.id } })
                      }
                    >
                      <Navigation className="size-4" aria-hidden="true" />
                      {nextStop ? `Next: ${nextStop.name}` : "Final stop"}
                    </Button>
                    <Button
                      variant="outline"
                      className="type-button min-h-14 w-full rounded-xl"
                      disabled={updateTrip.isPending}
                      onClick={() =>
                        updateTrip.mutate({
                          id: t.id,
                          patch: { status: "completed", ended_at: new Date().toISOString() },
                        })
                      }
                    >
                      <Square className="size-4" aria-hidden="true" />
                      End the trip
                    </Button>
                    <Button
                      variant={sharing ? "default" : "ghost"}
                      className="type-button min-h-12 w-full rounded-xl sm:col-span-2"
                      onClick={() => setSharing((s) => !s)}
                    >
                      <MapPin className="size-4" aria-hidden="true" />
                      {sharing ? "Sharing bus location — tap to stop" : "Share this bus's location"}
                    </Button>
                  </>
                ) : (
                  <p className="type-body-sm text-muted-foreground sm:col-span-2">
                    This run is finished. Ended {clockTime(t.ended_at) ?? "—"}.
                  </p>
                )}
              </div>
            </div>

            <LiveMap
              stops={stopList}
              positions={positions.data ?? []}
              highlightStopId={t.current_stop_id}
              busLabel={t.bus?.plate_no ?? "Bus"}
              live={t.status === "in_progress"}
            />
          </div>

          <div className="animate-rise" style={{ animationDelay: "80ms" }}>
            <div className="glass-elevated silk crest p-6">
              <h2 className="type-h2 text-chrome">Pupil list</h2>
              <p className="type-meta mt-1 text-muted-foreground">
                Tap a pupil as they board, then again when they get off.
              </p>

              <ul className="mt-5 space-y-2.5">
                {rows.map((r) => {
                  const on = r.status === "on_board";
                  const done = r.status === "dropped";
                  const nextState = on ? "dropped" : done ? "waiting" : "on_board";
                  return (
                    <li key={r.id}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={on}
                          disabled={t.status !== "in_progress" || setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ id: r.id, status: nextState, tripId: t.id })
                          }
                          className={cn(
                            "tap-target flex min-h-14 w-full items-center gap-4 border px-4 text-left disabled:opacity-70",
                            on
                              ? "border-primary/50 bg-primary/12"
                              : done
                                ? "border-success/40 bg-success/10"
                                : "border-hairline bg-surface-1/70 hover:bg-surface-1",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                              on || done
                                ? "chip-gradient border-transparent"
                                : "border-border bg-background/50 text-muted-foreground",
                            )}
                          >
                            {on || done ? <Check className="size-5" strokeWidth={2.4} /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="type-button block truncate text-foreground">
                              {fullName(r.student)}
                            </span>
                            <span className="type-meta block truncate text-muted-foreground">
                              {r.stop?.name ?? "No stop set"}
                              {r.stop
                                ? ` · ${
                                    t.direction === "to_school"
                                      ? (shortTime(r.stop.pickup_time) ?? "—")
                                      : (shortTime(r.stop.dropoff_time) ?? "—")
                                  }`
                                : ""}
                            </span>
                          </span>
                          <span className="type-meta shrink-0 text-right text-muted-foreground">
                            {on ? "On board" : done ? "Dropped" : r.status === "absent" ? "Absent" : "Waiting"}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Mark ${fullName(r.student)} absent`}
                          disabled={t.status !== "in_progress" || setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ id: r.id, status: "absent", tripId: t.id })
                          }
                        >
                          <CircleSlash className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
