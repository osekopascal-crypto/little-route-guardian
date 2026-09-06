import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/lib/students";
import { trackingKeys, type Bus, type RouteStop, type Trip, type TripDirection, type TripStatus } from "@/lib/tracking";

export type BusInput = {
  plate_no: string;
  label: string;
  capacity: number;
  status: "active" | "inactive";
};

export type RouteInput = {
  name: string;
  code: string;
  corridor: string | null;
  status: "active" | "inactive";
};

export type StopInput = {
  name: string;
  sequence: number;
  lat: number;
  lng: number;
  pickup_time: string | null;
  dropoff_time: string | null;
};

export type TripInput = {
  route_id: string;
  bus_id: string | null;
  attendant_id: string | null;
  trip_date: string;
  direction: TripDirection;
  status: TripStatus;
};

export type StaffOption = { id: string; full_name: string; phone: string | null };

export type RosterRow = {
  id: string;
  student_id: string;
  stop_id: string | null;
  status: string;
  student: Student;
};

const BUS_COLUMNS = "id, plate_no, label, capacity, status";
const ROUTE_COLUMNS = "id, name, code, corridor, status, created_at";
const STOP_COLUMNS = "id, route_id, name, sequence, lat, lng, pickup_time, dropoff_time";
const TRIP_SELECT =
  "id, route_id, bus_id, attendant_id, trip_date, direction, status, current_stop_id, started_at, ended_at, route:routes(id, name, code, corridor), bus:buses(id, plate_no, label, capacity, status)";

export type RouteAdmin = {
  id: string;
  name: string;
  code: string;
  corridor: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export const fleetKeys = {
  buses: ["fleet-buses"] as const,
  routes: ["fleet-routes"] as const,
  stops: (routeId: string) => ["fleet-stops", routeId] as const,
  attendants: ["fleet-attendants"] as const,
  trips: ["fleet-trips"] as const,
  roster: (tripId: string) => ["fleet-roster", tripId] as const,
};

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "That value is already used — plate numbers and route codes must be unique.";
  }
  if (lower.includes("row-level security")) {
    return "You don't have permission to make that change.";
  }
  if (lower.includes("violates foreign key")) {
    return "That record is still used elsewhere, so it can't be removed yet.";
  }
  return "We couldn't save that change. Please try again.";
}

/* ---------------- buses ---------------- */

export function useBuses() {
  return useQuery({
    queryKey: fleetKeys.buses,
    queryFn: async (): Promise<Bus[]> => {
      const { data, error } = await supabase
        .from("buses")
        .select(BUS_COLUMNS)
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Bus[];
    },
  });
}

export function useSaveBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      schoolId,
    }: {
      id?: string;
      values: BusInput;
      schoolId: string;
    }) => {
      const { error } = id
        ? await supabase.from("buses").update(values).eq("id", id)
        : await supabase.from("buses").insert({ ...values, school_id: schoolId });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fleetKeys.buses });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

export function useDeleteBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buses").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: fleetKeys.buses }),
  });
}

/* ---------------- routes & stops ---------------- */

export function useRoutesAdmin() {
  return useQuery({
    queryKey: fleetKeys.routes,
    queryFn: async (): Promise<RouteAdmin[]> => {
      const { data, error } = await supabase
        .from("routes")
        .select(ROUTE_COLUMNS)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RouteAdmin[];
    },
  });
}

export function useSaveRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      schoolId,
    }: {
      id?: string;
      values: RouteInput;
      schoolId: string;
    }) => {
      const { error } = id
        ? await supabase.from("routes").update(values).eq("id", id)
        : await supabase.from("routes").insert({ ...values, school_id: schoolId });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: fleetKeys.routes }),
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: fleetKeys.routes }),
  });
}

export function useStops(routeId: string | undefined) {
  return useQuery({
    queryKey: fleetKeys.stops(routeId ?? "none"),
    enabled: Boolean(routeId),
    queryFn: async (): Promise<RouteStop[]> => {
      const { data, error } = await supabase
        .from("route_stops")
        .select(STOP_COLUMNS)
        .eq("route_id", routeId!)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RouteStop[];
    },
  });
}

export function useSaveStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      routeId,
      values,
      schoolId,
    }: {
      id?: string;
      routeId: string;
      values: StopInput;
      schoolId: string;
    }) => {
      const { error } = id
        ? await supabase.from("route_stops").update(values).eq("id", id)
        : await supabase
            .from("route_stops")
            .insert({ ...values, route_id: routeId, school_id: schoolId });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: fleetKeys.stops(vars.routeId) });
      void qc.invalidateQueries({ queryKey: trackingKeys.stops(vars.routeId) });
    },
  });
}

export function useDeleteStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; routeId: string }) => {
      const { error } = await supabase.from("route_stops").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: fleetKeys.stops(vars.routeId) });
      void qc.invalidateQueries({ queryKey: trackingKeys.stops(vars.routeId) });
    },
  });
}

/* ---------------- attendants ---------------- */

export function useAttendantOptions() {
  return useQuery({
    queryKey: fleetKeys.attendants,
    queryFn: async (): Promise<StaffOption[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "attendant")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StaffOption[];
    },
  });
}

/* ---------------- trips & roster ---------------- */

export function useTrips() {
  return useQuery({
    queryKey: fleetKeys.trips,
    queryFn: async (): Promise<Trip[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_SELECT)
        .order("trip_date", { ascending: false })
        .order("direction", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as Trip[];
    },
  });
}

export function useSaveTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      schoolId,
    }: {
      id?: string;
      values: TripInput;
      schoolId: string;
    }) => {
      const { error } = id
        ? await supabase.from("trips").update(values).eq("id", id)
        : await supabase.from("trips").insert({ ...values, school_id: schoolId });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fleetKeys.trips });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("bus_positions").delete().eq("trip_id", id);
      await supabase.from("trip_students").delete().eq("trip_id", id);
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fleetKeys.trips });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

export function useTripRoster(tripId: string | undefined) {
  return useQuery({
    queryKey: fleetKeys.roster(tripId ?? "none"),
    enabled: Boolean(tripId),
    queryFn: async (): Promise<RosterRow[]> => {
      const { data, error } = await supabase
        .from("trip_students")
        .select("id, student_id, stop_id, status, student:students(*)")
        .eq("trip_id", tripId!);
      if (error) throw error;
      return ((data ?? []) as unknown as RosterRow[]).filter((r) => r.student);
    },
  });
}

export function useAddRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      studentId,
      stopId,
      schoolId,
    }: {
      tripId: string;
      studentId: string;
      stopId: string | null;
      schoolId: string;
    }) => {
      const { error } = await supabase.from("trip_students").insert({
        trip_id: tripId,
        student_id: studentId,
        stop_id: stopId,
        school_id: schoolId,
        status: "waiting",
      });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: fleetKeys.roster(vars.tripId) });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

export function useRemoveRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; tripId: string }) => {
      const { error } = await supabase.from("trip_students").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: fleetKeys.roster(vars.tripId) });
      void qc.invalidateQueries({ queryKey: trackingKeys.todayTrips });
    },
  });
}

export const directionLabel: Record<TripDirection, string> = {
  to_school: "Morning run to school",
  from_school: "Afternoon run home",
};

export function dayLabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
