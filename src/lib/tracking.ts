import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/lib/students";

export type TripDirection = "to_school" | "from_school";
export type TripStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type RiderStatus = "waiting" | "on_board" | "dropped" | "absent";

export type Bus = {
  id: string;
  plate_no: string;
  label: string;
  capacity: number;
  status: string;
};

export type RouteRow = {
  id: string;
  name: string;
  code: string;
  corridor: string | null;
};

export type RouteStop = {
  id: string;
  route_id: string;
  name: string;
  sequence: number;
  lat: number;
  lng: number;
  pickup_time: string | null;
  dropoff_time: string | null;
};

export type Trip = {
  id: string;
  route_id: string;
  bus_id: string | null;
  attendant_id: string | null;
  trip_date: string;
  direction: TripDirection;
  status: TripStatus;
  current_stop_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  route: RouteRow | null;
  bus: Bus | null;
};

export type BusPosition = {
  id: string;
  lat: number;
  lng: number;
  speed_kph: number | null;
  heading: number | null;
  recorded_at: string;
};

export type Rider = {
  id: string;
  trip_id: string;
  student_id: string;
  stop_id: string | null;
  status: RiderStatus;
  boarded_at: string | null;
  dropped_at: string | null;
  student: Student;
  stop: RouteStop | null;
  trip: Trip;
};

const TRIP_SELECT =
  "id, route_id, bus_id, attendant_id, trip_date, direction, status, current_stop_id, started_at, ended_at, route:routes(id, name, code, corridor), bus:buses(id, plate_no, label, capacity, status)";
const STOP_SELECT = "id, route_id, name, sequence, lat, lng, pickup_time, dropoff_time";

export const trackingKeys = {
  myRiders: ["my-riders"] as const,
  stops: (routeId: string) => ["route-stops", routeId] as const,
  positions: (tripId: string) => ["bus-positions", tripId] as const,
  attendantTrip: ["attendant-trip"] as const,
  manifest: (tripId: string) => ["trip-manifest", tripId] as const,
  todayTrips: ["today-trips"] as const,
};

/** Every trip row that belongs to one of the signed-in parent's children. */
export function useMyRiders() {
  return useQuery({
    queryKey: trackingKeys.myRiders,
    queryFn: async (): Promise<Rider[]> => {
      const { data, error } = await supabase
        .from("trip_students")
        .select(
          `id, trip_id, student_id, stop_id, status, boarded_at, dropped_at,
           student:students(*), stop:route_stops(${STOP_SELECT}), trip:trips(${TRIP_SELECT})`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Rider[]).filter((r) => r.trip && r.student);
    },
    refetchInterval: 20_000,
  });
}

export function useRouteStops(routeId: string | undefined) {
  return useQuery({
    queryKey: trackingKeys.stops(routeId ?? "none"),
    enabled: Boolean(routeId),
    queryFn: async (): Promise<RouteStop[]> => {
      const { data, error } = await supabase
        .from("route_stops")
        .select(STOP_SELECT)
        .eq("route_id", routeId!)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RouteStop[];
    },
  });
}

/** Live trail for a trip. Polls so the bus keeps moving without a page refresh. */
export function useBusPositions(tripId: string | undefined, live = true) {
  return useQuery({
    queryKey: trackingKeys.positions(tripId ?? "none"),
    enabled: Boolean(tripId),
    refetchInterval: live ? 10_000 : false,
    queryFn: async (): Promise<BusPosition[]> => {
      const { data, error } = await supabase
        .from("bus_positions")
        .select("id, lat, lng, speed_kph, heading, recorded_at")
        .eq("trip_id", tripId!)
        .order("recorded_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as BusPosition[];
    },
  });
}

/** The trip the signed-in attendant is running (most recent first). */
export function useAttendantTrip(attendantId: string | undefined) {
  return useQuery({
    queryKey: trackingKeys.attendantTrip,
    enabled: Boolean(attendantId),
    refetchInterval: 20_000,
    queryFn: async (): Promise<Trip | null> => {
      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_SELECT)
        .eq("attendant_id", attendantId!)
        .order("trip_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? []) as unknown as Trip[])[0] ?? null;
    },
  });
}

export type ManifestRow = {
  id: string;
  student_id: string;
  stop_id: string | null;
  status: RiderStatus;
  boarded_at: string | null;
  dropped_at: string | null;
  student: Student;
  stop: RouteStop | null;
};

export function useTripManifest(tripId: string | undefined) {
  return useQuery({
    queryKey: trackingKeys.manifest(tripId ?? "none"),
    enabled: Boolean(tripId),
    refetchInterval: 20_000,
    queryFn: async (): Promise<ManifestRow[]> => {
      const { data, error } = await supabase
        .from("trip_students")
        .select(
          `id, student_id, stop_id, status, boarded_at, dropped_at,
           student:students(*), stop:route_stops(${STOP_SELECT})`,
        )
        .eq("trip_id", tripId!);
      if (error) throw error;
      return ((data ?? []) as unknown as ManifestRow[])
        .filter((r) => r.student)
        .sort((a, b) => (a.stop?.sequence ?? 99) - (b.stop?.sequence ?? 99));
    },
  });
}

export type TripBoard = Trip & { riders: number; onBoard: number; last: BusPosition | null };

/** Admin command-centre view of today's trips with live headline numbers. */
export function useTodayTrips() {
  return useQuery({
    queryKey: trackingKeys.todayTrips,
    refetchInterval: 15_000,
    queryFn: async (): Promise<TripBoard[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_SELECT)
        .lte("trip_date", today)
        .order("trip_date", { ascending: false })
        .limit(8);
      if (error) throw error;
      const trips = (data ?? []) as unknown as Trip[];
      if (trips.length === 0) return [];

      const ids = trips.map((t) => t.id);
      const [{ data: riders }, { data: positions }] = await Promise.all([
        supabase.from("trip_students").select("trip_id, status").in("trip_id", ids),
        supabase
          .from("bus_positions")
          .select("trip_id, id, lat, lng, speed_kph, heading, recorded_at")
          .in("trip_id", ids)
          .order("recorded_at", { ascending: false })
          .limit(400),
      ]);

      return trips.map((t) => {
        const mine = (riders ?? []).filter((r) => r.trip_id === t.id);
        const last = (positions ?? []).find((p) => p.trip_id === t.id) ?? null;
        return {
          ...t,
          riders: mine.length,
          onBoard: mine.filter((r) => r.status === "on_board").length,
          last: (last as BusPosition | null) ?? null,
        };
      });
    },
  });
}

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("row-level security")) {
    return "You can only update trips assigned to you.";
  }
  return "We couldn't save that just now. Please try again.";
}

export function useSetRiderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: RiderStatus;
      tripId: string;
    }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "on_board") patch['boarded_at'] = new Date().toISOString();
      if (status === "dropped") patch['dropped_at'] = new Date().toISOString();
      const { error } = await supabase.from("trip_students").update(patch).eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: trackingKeys.manifest(vars.tripId) });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

export function useUpdateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Trip, "status" | "current_stop_id" | "started_at" | "ended_at">>;
    }) => {
      const { error } = await supabase.from("trips").update(patch).eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: trackingKeys.attendantTrip });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

/** Attendant device pushes its own GPS fix as the bus position. */
export function useSharePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      busId,
      schoolId,
      lat,
      lng,
      speedKph,
      heading,
    }: {
      tripId: string;
      busId: string | null;
      schoolId: string;
      lat: number;
      lng: number;
      speedKph: number | null;
      heading: number | null;
    }) => {
      const { error } = await supabase.from("bus_positions").insert({
        trip_id: tripId,
        bus_id: busId,
        school_id: schoolId,
        lat,
        lng,
        speed_kph: speedKph,
        heading,
      });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: trackingKeys.positions(vars.tripId) });
    },
  });
}

/* ---------- derived, human-first helpers ---------- */

export const riderStatusLabel: Record<RiderStatus, string> = {
  waiting: "Waiting for pickup",
  on_board: "On the bus",
  dropped: "Safely dropped off",
  absent: "Marked absent",
};

export const tripStatusLabel: Record<TripStatus, string> = {
  planned: "Not started yet",
  in_progress: "On the road",
  completed: "Journey finished",
  cancelled: "Cancelled",
};

/** 0 Home · 1 Waiting · 2 On the bus · 3 Arrived — for the journey ribbon. */
export function journeyPosition(rider: { status: RiderStatus; trip: { status: TripStatus } }) {
  if (rider.status === "dropped") return 3;
  if (rider.status === "on_board") return 2;
  if (rider.status === "absent") return 0;
  return rider.trip.status === "in_progress" ? 1 : 0;
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Friendly minutes-away estimate; assumes town traffic when speed is unknown. */
export function etaMinutes(
  position: { lat: number; lng: number; speed_kph?: number | null } | null | undefined,
  target: { lat: number; lng: number } | null | undefined,
): number | null {
  if (!position || !target) return null;
  const km = distanceKm(position, target);
  const speed = Math.max(12, Math.min(position.speed_kph ?? 22, 60));
  const minutes = Math.round((km / speed) * 60);
  return Math.max(1, minutes);
}

export function clockTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
}

export function shortTime(value: string | null | undefined) {
  if (!value) return null;
  const [h, m] = value.split(":");
  if (h === undefined || m === undefined) return value;
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
}
