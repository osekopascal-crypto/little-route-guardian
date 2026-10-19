import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { alongRoad, fetchRoadLine, formatDistance, nearestIndex, type LatLng } from "@/lib/road-route";
import type { BusPosition, RouteStop } from "@/lib/tracking";

type Props = {
  stops: RouteStop[];
  positions: BusPosition[];
  highlightStopId?: string | null | undefined;
  currentStopId?: string | null | undefined;
  busLabel: string;
  stopInitials?: string | undefined;
  live?: boolean | undefined;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const STALE_MS = 2 * 60 * 1000;

/** Browser-only Leaflet street map. Import lazily — never from SSR code. */
export default function StreetMap({
  stops,
  positions,
  highlightStopId,
  currentStopId,
  busLabel,
  stopInitials,
  live,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const busMarker = useRef<L.Marker | null>(null);
  const [follow, setFollow] = useState(false);
  const fitted = useRef(false);
  const [road, setRoad] = useState<LatLng[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const sorted = useMemo(() => [...stops].sort((a, b) => a.sequence - b.sequence), [stops]);
  const stopKey = sorted.map((s) => `${s.lat},${s.lng}`).join("|");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const pts = sorted.map((s) => [s.lat, s.lng] as LatLng);
    setRoad(pts);
    void fetchRoadLine(pts).then((line) => alive && setRoad(line));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true, tap: true } as L.MapOptions);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "map-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.setView([-1.15, 36.822], 14);
    m.on("dragstart", () => setFollow(false));
    layers.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  const currentSeq = sorted.find((s) => s.id === currentStopId)?.sequence ?? null;

  // Route, stops, trail
  useEffect(() => {
    const m = map.current;
    const g = layers.current;
    if (!m || !g) return;
    g.clearLayers();
    if (road.length > 1) {
      L.polyline(road, { className: "map-route-glow", weight: 12, opacity: 1 }).addTo(g);
      L.polyline(road, { className: "map-route-line", weight: 4, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(g);
    }
    if (positions.length > 1) {
      L.polyline(positions.map((p) => [p.lat, p.lng] as L.LatLngTuple), {
        className: "map-trail-line",
        weight: 4,
        lineCap: "round",
      }).addTo(g);
    }
    sorted.forEach((s, i) => {
      const mine = s.id === highlightStopId;
      const passed = currentSeq !== null && s.sequence < currentSeq;
      const next = s.id === currentStopId;
      const last = i === sorted.length - 1;
      const html = mine
        ? `<div class="map-mystop"><span>${esc(stopInitials ?? "★")}</span></div>`
        : `<div class="map-stop${passed ? " is-passed" : ""}${next ? " is-next" : ""}${last ? " is-school" : ""}"></div>`;
      const size = mine ? 38 : next || last ? 20 : 14;
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        zIndexOffset: mine ? 500 : next ? 300 : 0,
      })
        .bindTooltip(
          `<b>${i + 1}. ${esc(s.name)}</b>${s.pickup_time ? `<br/>${last ? "Arrives" : "Pickup"} ${s.pickup_time.slice(0, 5)}` : ""}${mine ? "<br/>Your stop" : passed ? "<br/>Bus has passed" : next ? "<br/>Next stop" : ""}`,
          { direction: "top", offset: [0, -size / 2], permanent: mine, className: "map-tip" },
        )
        .addTo(g);
    });
    if (!fitted.current && road.length > 0) {
      const pts = [...road, ...positions.slice(-1).map((p) => [p.lat, p.lng] as L.LatLngTuple)];
      m.fitBounds(L.latLngBounds(pts), { padding: [36, 36] });
      fitted.current = true;
    }
  }, [road, sorted, positions, highlightStopId, currentStopId, currentSeq, stopInitials]);

  const latest = positions.at(-1);

  // Bus marker
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!latest) {
      busMarker.current?.remove();
      busMarker.current = null;
      return;
    }
    const heading = latest.heading ?? 0;
    const html = `<div class="map-bus"><span class="map-bus-pulse"></span>${latest.heading != null ? `<span class="map-bus-arrow" style="transform:rotate(${heading}deg)"></span>` : ""}<span class="map-bus-core"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 6v6M16 6v6M2 12h20M18 18h2a1 1 0 0 0 1-1V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v10a1 1 0 0 0 1 1h2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg></span><span class="map-bus-label">${esc(busLabel)}</span></div>`;
    const icon = L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] });
    if (!busMarker.current) busMarker.current = L.marker([latest.lat, latest.lng], { icon, zIndexOffset: 1000 }).addTo(m);
    else busMarker.current.setLatLng([latest.lat, latest.lng]).setIcon(icon);
    if (follow) m.panTo([latest.lat, latest.lng], { animate: true });
  }, [latest, busLabel, follow]);

  const mine = sorted.find((s) => s.id === highlightStopId);
  const busPt = latest ? ([latest.lat, latest.lng] as LatLng) : null;
  const remaining = busPt && mine ? alongRoad(road, busPt, [mine.lat, mine.lng]) : null;
  const offRoute = busPt && road.length > 1 ? nearestIndex(road, busPt).offRoute : 0;
  const stale = latest ? now - new Date(latest.recorded_at).getTime() > STALE_MS : false;

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" />

      {live && (
        <div className="glass-floating absolute left-3 top-3 z-[500] max-w-[70%] rounded-2xl px-3 py-2 text-xs text-foreground">
          {!latest ? (
            <p className="font-semibold">Waiting for the bus to share its location</p>
          ) : stale ? (
            <p className="font-semibold text-destructive">Bus signal lost · last seen {Math.round((now - new Date(latest.recorded_at).getTime()) / 60000)} min ago</p>
          ) : (
            <>
              {remaining != null && <p className="type-section leading-tight">{formatDistance(remaining)} to {mine?.name}</p>}
              <p className="text-muted-foreground">
                {latest.speed_kph != null ? `${Math.round(latest.speed_kph)} km/h · ` : ""}
                {offRoute > 400 ? "Off the usual route" : "On route"}
              </p>
            </>
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2">
        {mine && (
          <button
            type="button"
            className="glass-floating rounded-full px-3 py-2 text-xs font-semibold text-foreground"
            onClick={() => {
              setFollow(false);
              map.current?.flyTo([mine.lat, mine.lng], 17);
            }}
          >
            My stop
          </button>
        )}
        {latest && (
          <button
            type="button"
            aria-pressed={follow}
            className="glass-floating rounded-full px-3 py-2 text-xs font-semibold text-foreground aria-pressed:ring-2 aria-pressed:ring-primary"
            onClick={() => {
              setFollow(true);
              map.current?.flyTo([latest.lat, latest.lng], 16);
            }}
          >
            {follow ? "Following bus" : "Follow bus"}
          </button>
        )}
        <button
          type="button"
          className="glass-floating rounded-full px-3 py-2 text-xs font-semibold text-foreground"
          onClick={() => {
            setFollow(false);
            const pts = [...road, ...(busPt ? [busPt] : [])];
            if (pts.length) map.current?.flyToBounds(L.latLngBounds(pts), { padding: [36, 36] });
          }}
        >
          Whole route
        </button>
      </div>
    </div>
  );
}
