// Browser-safe helpers for road-following route geometry and distances.

export type LatLng = [number, number];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Straight-line distance in metres. */
export function haversine(a: LatLng, b: LatLng) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Index of the line vertex closest to a point. */
export function nearestIndex(line: LatLng[], p: LatLng) {
  let best = 0;
  let bestD = Infinity;
  line.forEach((q, i) => {
    const d = haversine(q, p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return { index: best, offRoute: bestD };
}

/** Distance along the road line between two points (metres). */
export function alongRoad(line: LatLng[], from: LatLng, to: LatLng) {
  if (line.length < 2) return haversine(from, to);
  const a = nearestIndex(line, from);
  const b = nearestIndex(line, to);
  if (b.index <= a.index) return haversine(from, to);
  let d = a.offRoute;
  for (let i = a.index; i < b.index; i++) d += haversine(line[i]!, line[i + 1]!);
  return d;
}

const cacheKey = (pts: LatLng[]) => `road:v1:${pts.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(";")}`;

/**
 * Fetches a road-following line through the stops (OpenStreetMap road data).
 * Cached on the device; falls back to straight segments if offline.
 */
export async function fetchRoadLine(pts: LatLng[]): Promise<LatLng[]> {
  if (pts.length < 2) return pts;
  const key = cacheKey(pts);
  try {
    const hit = localStorage.getItem(key);
    if (hit) return JSON.parse(hit) as LatLng[];
  } catch {
    /* storage unavailable */
  }
  const coords = pts.map((p) => `${p[1]},${p[0]}`).join(";");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: ctrl.signal },
    );
    if (!res.ok) throw new Error("route");
    const json = (await res.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] };
    const line = json.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng);
    if (!line?.length) throw new Error("route");
    try {
      localStorage.setItem(key, JSON.stringify(line));
    } catch {
      /* ignore */
    }
    return line;
  } catch {
    return pts;
  } finally {
    clearTimeout(t);
  }
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}
