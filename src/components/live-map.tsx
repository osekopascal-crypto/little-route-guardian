import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";

import { StatusPill } from "@/components/status-pill";
import type { BusPosition, RouteStop } from "@/lib/tracking";
import { cn } from "@/lib/utils";

const StreetMap = lazy(() => import("@/components/street-map"));

function timeAgo(iso?: string) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

/** Live street map: real roads, the route, stops and a glowing bus marker. */
export function LiveMap({
  stops,
  positions,
  highlightStopId,
  busLabel = "Bus",
  className,
  live = true,
  stopInitials,
}: {
  stops: RouteStop[];
  positions: BusPosition[];
  highlightStopId?: string | null;
  busLabel?: string;
  className?: string;
  live?: boolean;
  stopInitials?: string;
}) {
  const latest = positions.at(-1);
  const fallback = <div className="h-full w-full animate-pulse bg-muted" />;

  return (
    <div className={cn("glass-elevated silk crest edge-lit p-5 sm:p-6", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="type-h2 min-w-0 truncate text-chrome">Live map</h2>
        <StatusPill tone={live ? "success" : "neutral"}>{live ? "Live" : "Idle"}</StatusPill>
      </div>

      <div className="relative mt-4 h-[340px] overflow-hidden rounded-2xl border border-hairline sm:h-[420px]">
        <ClientOnly fallback={fallback}>
          <Suspense fallback={fallback}>
            <StreetMap
              stops={stops}
              positions={positions}
              highlightStopId={highlightStopId}
              busLabel={busLabel}
              stopInitials={stopInitials}
            />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 type-meta text-muted-foreground">
        <span>{busLabel}</span>
        {latest ? (
          <>
            <ClientOnly fallback={null}>
              <span>Updated {timeAgo(latest.recorded_at)}</span>
            </ClientOnly>
            {latest.speed_kph != null && <span>{Math.round(latest.speed_kph)} km/h</span>}
          </>
        ) : (
          <span>Waiting for the bus to share its location</span>
        )}
      </div>
    </div>
  );
}
