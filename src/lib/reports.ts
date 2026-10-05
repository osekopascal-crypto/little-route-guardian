import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ReportRider = {
  student_id: string;
  status: "waiting" | "on_board" | "dropped" | "absent";
  trip: { trip_date: string; route_id: string } | null;
};

export type ReportTrip = {
  id: string;
  route_id: string;
  trip_date: string;
  direction: "to_school" | "from_school";
  status: "planned" | "in_progress" | "completed" | "cancelled";
  started_at: string | null;
  route: { name: string } | null;
};

export type ReportStop = {
  route_id: string;
  sequence: number;
  pickup_time: string | null;
  dropoff_time: string | null;
};

export function useReportData(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const [riders, trips, stops] = await Promise.all([
        supabase
          .from("trip_students")
          .select("student_id, status, trip:trips!inner(trip_date, route_id)")
          .gte("trip.trip_date", from)
          .lte("trip.trip_date", to),
        supabase
          .from("trips")
          .select("id, route_id, trip_date, direction, status, started_at, route:routes(name)")
          .gte("trip_date", from)
          .lte("trip_date", to),
        supabase.from("route_stops").select("route_id, sequence, pickup_time, dropoff_time"),
      ]);
      if (riders.error) throw riders.error;
      if (trips.error) throw trips.error;
      if (stops.error) throw stops.error;
      return {
        riders: (riders.data ?? []) as unknown as ReportRider[],
        trips: (trips.data ?? []) as unknown as ReportTrip[],
        stops: (stops.data ?? []) as ReportStop[],
      };
    },
  });
}

/** Download rows as a CSV file Excel can open. */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function presetRange(preset: "week" | "month" | "term"): { from: string; to: string } {
  const now = new Date();
  const to = isoDate(now);
  if (preset === "week") {
    const d = new Date(now);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return { from: isoDate(d), to };
  }
  if (preset === "month") {
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
  // Kenyan school terms: Jan–Mar, May–Jul, Aug/Sep–Nov
  const m = now.getMonth();
  const start = m <= 3 ? 0 : m <= 6 ? 4 : 7;
  return { from: isoDate(new Date(now.getFullYear(), start, 1)), to };
}
