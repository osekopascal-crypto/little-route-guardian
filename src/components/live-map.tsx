import { useId } from "react";

import { StatusPill } from "@/components/status-pill";
import type { BusPosition, RouteStop } from "@/lib/tracking";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

const W = 400;
const H = 260;
const PAD = 30;

/** Project real lat/lng onto the canvas, keeping the corridor centred. */
function project(points: { lat: number; lng: number }[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.004);
  const spanLng = Math.max(maxLng - minLng, 0.004);

  return (p: { lat: number; lng: number }): Point => ({
    x: PAD + ((p.lng - minLng) / spanLng) * (W - PAD * 2),
    // latitude grows northwards, screen y grows downwards
    y: H - PAD - ((p.lat - minLat) / spanLat) * (H - PAD * 2),
  });
}

function curve(points: Point[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points as [Point, ...Point[]];
  let d = `M ${first.x} ${first.y}`;
  let prev = first;
  for (const p of rest) {
    const cx = (prev.x + p.x) / 2;
    d += ` Q ${cx} ${prev.y} ${p.x} ${p.y}`;
    prev = p;
  }
  return d;
}

/**
 * Live corridor map: the route drawn from real stop coordinates, the travelled
 * trail, and a glowing bus marker at the latest fix.
 */
export function LiveMap({
  stops,
  positions,
  highlightStopId,
  busLabel = "Bus",
  className,
  live = true,
}: {
  stops: RouteStop[];
  positions: BusPosition[];
  highlightStopId?: string | null;
  busLabel?: string;
  className?: string;
  live?: boolean;
}) {
  const gid = useId().replace(/[:]/g, "");
  const all = [...stops, ...positions];
  const to = project(all.length > 1 ? all : [{ lat: -1.17, lng: 36.83 }, { lat: -1.12, lng: 36.8 }]);

  const stopPts = stops.map((s) => ({ stop: s, pt: to(s) }));
  const trail = positions.map((p) => to(p));
  const latest = positions.at(-1);
  const bus = latest ? to(latest) : null;

  return (
    <div className={cn("glass-elevated silk crest edge-lit p-5 sm:p-6", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="type-h2 min-w-0 truncate text-chrome">Live corridor</h2>
        <StatusPill tone={live ? "success" : "neutral"}>{live ? "Live" : "Idle"}</StatusPill>
      </div>

      <div className="map-canvas relative mt-4 overflow-hidden rounded-2xl border border-hairline">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Bus location on the route">
          <defs>
            <linearGradient id={`route-${gid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.86 0.13 90)" stopOpacity="0.35" />
              <stop offset="55%" stopColor="oklch(0.8 0.155 82)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="oklch(0.72 0.14 62)" stopOpacity="0.45" />
            </linearGradient>
            <radialGradient id={`halo-${gid}`}>
              <stop offset="0%" stopColor="oklch(0.8 0.155 82)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(0.8 0.155 82)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* route */}
          <path
            d={curve(stopPts.map((s) => s.pt))}
            stroke={`url(#route-${gid})`}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* travelled trail */}
          {trail.length > 1 && (
            <path
              d={curve(trail)}
              stroke="oklch(0.35 0.02 65)"
              strokeOpacity="0.4"
              strokeWidth="1.6"
              strokeDasharray="5 7"
              fill="none"
            />
          )}

          {stopPts.map(({ stop, pt }) => {
            const isTarget = stop.id === highlightStopId;
            return (
              <g key={stop.id}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isTarget ? 6 : 4}
                  fill={isTarget ? "oklch(0.8 0.155 82)" : "oklch(0.995 0.004 90)"}
                  stroke="oklch(0.31 0.008 65)"
                  strokeOpacity={isTarget ? 0.9 : 0.35}
                  strokeWidth="1.4"
                />
                <text
                  x={pt.x}
                  y={pt.y - 11}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight={isTarget ? 700 : 500}
                  fill="oklch(0.31 0.008 65)"
                >
                  {stop.name}
                </text>
              </g>
            );
          })}

          {bus && (
            <g>
              <circle cx={bus.x} cy={bus.y} r="22" fill={`url(#halo-${gid})`} />
              <circle
                cx={bus.x}
                cy={bus.y}
                r="7"
                fill="oklch(0.19 0.008 65)"
                stroke="oklch(0.86 0.13 90)"
                strokeWidth="2"
              />
              <text
                x={bus.x}
                y={bus.y + 21}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="oklch(0.21 0.009 65)"
              >
                {busLabel}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
