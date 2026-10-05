import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type IncidentKind = "delay" | "breakdown" | "road" | "behaviour" | "injury" | "other";
export type IncidentSeverity = "low" | "medium" | "high";

export type Incident = {
  id: string;
  school_id: string;
  trip_id: string | null;
  bus_id: string | null;
  student_id: string | null;
  reported_by: string;
  kind: IncidentKind;
  severity: IncidentSeverity;
  description: string;
  status: "open" | "resolved";
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

export type IncidentInput = {
  kind: IncidentKind;
  severity: IncidentSeverity;
  description: string;
  student_id: string | null;
  trip_id: string | null;
  bus_id: string | null;
};

export const incidentKeys = { all: ["incidents"] as const };

const COLUMNS =
  "id, school_id, trip_id, bus_id, student_id, reported_by, kind, severity, description, status, resolved_at, resolution_note, created_at";

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("row-level security")) {
    return "You don't have permission to do that.";
  }
  return "We couldn't save that. Please try again.";
}

export function useIncidents() {
  return useQuery({
    queryKey: incidentKeys.all,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Incident[]> => {
      const { data, error } = await supabase
        .from("incidents")
        .select(COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
  });
}

export function useReportIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      schoolId,
      reporterId,
    }: {
      input: IncidentInput;
      schoolId: string;
      reporterId: string;
    }) => {
      const { error } = await supabase.from("incidents").insert({
        ...input,
        description: input.description.trim(),
        school_id: schoolId,
        reported_by: reporterId,
      });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      note,
      resolverId,
      reopen = false,
    }: {
      id: string;
      note: string;
      resolverId: string;
      reopen?: boolean;
    }) => {
      const { error } = await supabase
        .from("incidents")
        .update(
          reopen
            ? { status: "open", resolved_at: null, resolved_by: null, resolution_note: null }
            : {
                status: "resolved",
                resolved_at: new Date().toISOString(),
                resolved_by: resolverId,
                resolution_note: note.trim() || null,
              },
        )
        .eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export const kindLabel: Record<IncidentKind, string> = {
  delay: "Running late",
  breakdown: "Breakdown",
  road: "Road issue",
  behaviour: "Pupil behaviour",
  injury: "Injury",
  other: "Other",
};

export const severityLabel: Record<IncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const severityTone: Record<IncidentSeverity, "neutral" | "warning" | "error"> = {
  low: "neutral",
  medium: "warning",
  high: "error",
};
