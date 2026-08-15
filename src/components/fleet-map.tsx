import { StatusPill } from "@/components/status-pill";

/**
 * Fleet visualisation — a designed, brand-native route field with glowing
 * bus markers. Static preview until live telemetry lands.
 */
const markers = [
  { id: "Bus 07", state: "On route", x: 22, y: 30 },
  { id: "Bus 03", state: "Delayed", x: 74, y: 24, alert: true },
  { id: "Bus 02", state: "On route", x: 55, y: 56 },
  { id: "Bus 01", state: "At school", x: 30, y: 74, arrived: true },
];

export function FleetMap() {
  return (
    <div className="glass-elevated silk crest edge-lit h-full p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="type-h2 min-w-0 truncate text-chrome">Live fleet</h2>
        <StatusPill tone="success">Live</StatusPill>
      </div>

      <div className="map-canvas relative mt-5 aspect-[16/11] overflow-hidden rounded-2xl border border-hairline">
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 400 275"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fleet-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.86 0.13 90)" stopOpacity="0.15" />
              <stop offset="50%" stopColor="oklch(0.8 0.155 82)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="oklch(0.72 0.14 62)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M20 110 C 90 60 130 130 200 120 S 320 60 385 95"
            stroke="url(#fleet-route)"
            strokeWidth="1.8"
            className="route-draw"
            style={{ ["--route-length" as string]: "900" }}
          />
          <path
            d="M40 240 C 120 210 150 160 230 165 S 340 200 390 170"
            stroke="oklch(0.8 0.155 82)"
            strokeOpacity="0.28"
            strokeWidth="1.2"
            strokeDasharray="6 10"
          />
          {[
            [88, 84],
            [200, 120],
            [300, 92],
            [230, 165],
          ].map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="2.6"
              fill="oklch(0.86 0.13 90)"
              opacity="0.7"
            />
          ))}
        </svg>

        {markers.map((m) => (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <div
              className={
                m.alert
                  ? "type-meta rounded-full border border-destructive/40 bg-destructive/25 px-3 py-1.5 font-semibold text-destructive-foreground backdrop-blur-sm"
                  : m.arrived
                    ? "type-meta rounded-full border border-success/40 bg-success/25 px-3 py-1.5 font-semibold text-success-foreground backdrop-blur-sm"
                    : "chip-gradient type-meta rounded-full px-3 py-1.5 font-semibold"
              }
            >
              {m.id} · {m.state}
            </div>
            <span
              aria-hidden="true"
              className="stop-node mx-auto mt-1.5 block size-2.5"
            />
          </div>
        ))}
      </div>

      <p className="type-meta mt-4 text-muted-foreground">
        Kiambu · Ndumberi · Banana · Ruiru corridors — live positions activate with the trips
        module.
      </p>
    </div>
  );
}

const stops = [
  { name: "Kiambu Stage", eta: "8:40 AM", bus: "Bus 07", away: "6 min" },
  { name: "Banana Junction", eta: "8:52 AM", bus: "Bus 07", away: "18 min" },
  { name: "Ndumberi Centre", eta: "9:02 AM", bus: "Bus 07", away: "28 min" },
  { name: "School", eta: "9:15 AM", bus: "Bus 07", away: "41 min" },
];

export function UpcomingStops() {
  return (
    <div className="glass silk crest h-full p-6">
      <h2 className="type-h2 text-chrome">Upcoming stops</h2>
      <ul className="mt-5 space-y-1.5">
        {stops.map((s, i) => (
          <li key={s.name} className="flex items-center gap-3.5 rounded-xl px-1 py-2.5">
            <span className="relative flex flex-col items-center">
              <span
                aria-hidden="true"
                className={i === 0 ? "stop-node size-2.5" : "size-2.5 rounded-full bg-primary/40"}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="type-body-sm truncate font-semibold text-foreground">{s.name}</p>
              <p className="type-meta text-muted-foreground">ETA {s.eta}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="type-meta text-foreground">{s.bus}</p>
              <p className="type-meta text-muted-foreground">{s.away}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
