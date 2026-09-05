import { Bus } from "lucide-react";

import { LiveMap } from "@/components/live-map";
import { StatusPill } from "@/components/status-pill";
import {
  clockTime,
  etaMinutes,
  shortTime,
  tripStatusLabel,
  useBusPositions,
  useRouteStops,
  useTodayTrips,
  type TripBoard,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";

function pickTrip(trips: TripBoard[]): TripBoard | null {
  return trips.find((t) => t.status === "in_progress") ?? trips[0] ?? null;
}

/** Live fleet panel: the active run drawn on its real corridor, plus today's board. */
export function FleetMap() {
  const trips = useTodayTrips();
  const board = trips.data ?? [];
  const focus = pickTrip(board);
  const stops = useRouteStops(focus?.route_id);
  const positions = useBusPositions(focus?.id, focus?.status === "in_progress");

  return (
    <div className="space-y-4">
      <LiveMap
        stops={stops.data ?? []}
        positions={positions.data ?? []}
        highlightStopId={focus?.current_stop_id ?? null}
        busLabel={focus?.bus?.plate_no ?? "Bus"}
        live={focus?.status === "in_progress"}
      />

      <div className="glass silk crest p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-h2 text-chrome">Today's runs</h2>
          <StatusPill tone={board.some((t) => t.status === "in_progress") ? "success" : "neutral"}>
            {board.filter((t) => t.status === "in_progress").length} on the road
          </StatusPill>
        </div>

        {board.length === 0 ? (
          <p className="type-body mt-4 text-muted-foreground">
            No runs scheduled yet. Once buses and routes are set up, every run shows here with
            live positions.
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {board.map((t) => (
              <li key={t.id} className="glass-soft flex items-center gap-3.5 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="chip-gradient grid size-9 shrink-0 place-items-center rounded-xl"
                >
                  <Bus className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="type-body-sm truncate font-semibold text-foreground">
                    {t.route?.name ?? "Route"} · {t.bus?.plate_no ?? "No bus"}
                  </p>
                  <p className="type-meta text-muted-foreground">
                    {t.onBoard}/{t.riders} pupils on board · {t.trip_date}
                    {t.started_at ? ` · from ${clockTime(t.started_at)}` : ""}
                  </p>
                </div>
                <StatusPill tone={t.status === "in_progress" ? "success" : "neutral"}>
                  {tripStatusLabel[t.status]}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Stops on the active run with live minutes-away estimates. */
export function UpcomingStops() {
  const trips = useTodayTrips();
  const focus = pickTrip(trips.data ?? []);
  const stops = useRouteStops(focus?.route_id);
  const positions = useBusPositions(focus?.id, focus?.status === "in_progress");
  const latest = (positions.data ?? []).at(-1) ?? null;
  const list = stops.data ?? [];
  const currentIndex = list.findIndex((s) => s.id === focus?.current_stop_id);

  return (
    <div className="glass silk crest h-full p-6">
      <h2 className="type-h2 text-chrome">Upcoming stops</h2>
      <p className="type-meta mt-1 text-muted-foreground">
        {focus?.route?.corridor ?? "Set up a route to see stop timings."}
      </p>
      <ul className="mt-5 space-y-1.5">
        {list.map((s, i) => {
          const eta = focus?.status === "in_progress" ? etaMinutes(latest, s) : null;
          const passed = currentIndex >= 0 && i < currentIndex;
          return (
            <li key={s.id} className="flex items-center gap-3.5 rounded-xl px-1 py-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2.5 shrink-0",
                  i === currentIndex ? "stop-node" : "rounded-full",
                  passed ? "bg-primary/25" : i === currentIndex ? "" : "bg-primary/45",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="type-body-sm truncate font-semibold text-foreground">{s.name}</p>
                <p className="type-meta text-muted-foreground">
                  Scheduled {shortTime(s.pickup_time) ?? "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="type-meta text-foreground">{focus?.bus?.plate_no ?? "—"}</p>
                <p className="type-meta text-muted-foreground">
                  {passed ? "Passed" : eta !== null ? `${eta} min` : "—"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
