import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { BusPosition, RouteStop } from "@/lib/tracking";

type Props = {
  stops: RouteStop[];
  positions: BusPosition[];
  highlightStopId?: string | null | undefined;
  busLabel: string;
  stopInitials?: string | undefined;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Browser-only Leaflet street map. Import lazily — never from SSR code. */
export default function StreetMap({ stops, positions, highlightStopId, busLabel, stopInitials }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const busMarker = useRef<L.Marker | null>(null);
  const [follow, setFollow] = useState(false);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
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

  // Route, stops, trail
  useEffect(() => {
    const m = map.current;
    const g = layers.current;
    if (!m || !g) return;
    g.clearLayers();
    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    const line = sorted.map((s) => [s.lat, s.lng] as L.LatLngTuple);
    if (line.length > 1) {
      L.polyline(line, { className: "map-route-glow", weight: 12, opacity: 1 }).addTo(g);
      L.polyline(line, { className: "map-route-line", weight: 4, opacity: 1, dashArray: "1 10", lineCap: "round" }).addTo(g);
    }
    if (positions.length > 1) {
      L.polyline(positions.map((p) => [p.lat, p.lng] as L.LatLngTuple), {
        className: "map-trail-line",
        weight: 3,
      }).addTo(g);
    }
    for (const s of sorted) {
      const mine = s.id === highlightStopId;
      const html = mine
        ? `<div class="map-mystop"><span>${esc(stopInitials ?? "★")}</span></div>`
        : `<div class="map-stop"></div>`;
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({ html, className: "", iconSize: mine ? [38, 38] : [14, 14], iconAnchor: mine ? [19, 19] : [7, 7] }),
        zIndexOffset: mine ? 500 : 0,
      })
        .bindTooltip(
          `<b>${esc(s.name)}</b>${s.pickup_time ? `<br/>Pickup ${s.pickup_time.slice(0, 5)}` : ""}${mine ? "<br/>Your stop" : ""}`,
          { direction: "top", offset: [0, -10], permanent: mine, className: "map-tip" },
        )
        .addTo(g);
    }
    if (!fitted.current && line.length > 0) {
      const pts = [...line, ...positions.slice(-1).map((p) => [p.lat, p.lng] as L.LatLngTuple)];
      m.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
      fitted.current = true;
    }
  }, [stops, positions, highlightStopId, stopInitials]);

  // Bus marker
  const latest = positions.at(-1);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!latest) {
      busMarker.current?.remove();
      busMarker.current = null;
      return;
    }
    const heading = latest.heading ?? 0;
    const html = `<div class="map-bus"><span class="map-bus-pulse"></span><span class="map-bus-arrow" style="transform:rotate(${heading}deg)"></span><span class="map-bus-core"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 6v6M16 6v6M2 12h20M18 18h2a1 1 0 0 0 1-1V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v10a1 1 0 0 0 1 1h2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg></span><span class="map-bus-label">${esc(busLabel)}</span></div>`;
    const icon = L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] });
    if (!busMarker.current) busMarker.current = L.marker([latest.lat, latest.lng], { icon, zIndexOffset: 1000 }).addTo(m);
    else busMarker.current.setLatLng([latest.lat, latest.lng]).setIcon(icon);
    if (follow) m.panTo([latest.lat, latest.lng], { animate: true });
  }, [latest, busLabel, follow]);

  const mine = stops.find((s) => s.id === highlightStopId);

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 z-[500] flex flex-col gap-2">
        {mine && (
          <button
            type="button"
            className="glass-floating rounded-full px-3 py-1.5 text-xs font-semibold text-foreground"
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
            className="glass-floating rounded-full px-3 py-1.5 text-xs font-semibold text-foreground aria-pressed:ring-2 aria-pressed:ring-primary"
            onClick={() => {
              setFollow(true);
              map.current?.flyTo([latest.lat, latest.lng], 16);
            }}
          >
            {follow ? "Following bus" : "Track bus"}
          </button>
        )}
        <button
          type="button"
          className="glass-floating rounded-full px-3 py-1.5 text-xs font-semibold text-foreground"
          onClick={() => {
            setFollow(false);
            const pts = [...stops, ...(latest ? [latest] : [])].map((p) => [p.lat, p.lng] as L.LatLngTuple);
            if (pts.length) map.current?.flyToBounds(L.latLngBounds(pts), { padding: [40, 40] });
          }}
        >
          Whole route
        </button>
      </div>
    </div>
  );
}
