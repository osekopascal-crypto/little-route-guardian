import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  kindLabel,
  severityLabel,
  severityTone,
  useIncidents,
  useResolveIncident,
  type Incident,
} from "@/lib/incidents";
import { timeAgo } from "@/lib/notifications";
import { fullName, useStudents } from "@/lib/students";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/incidents")({
  head: () => ({
    meta: [
      { title: "Safety incidents — School Transport" },
      {
        name: "description",
        content:
          "Every delay, breakdown and safety report from the bus, with who resolved it and how.",
      },
      { property: "og:title", content: "Safety incidents — School Transport" },
      {
        property: "og:description",
        content: "Safety and delay reports from bus attendants, tracked to resolution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <IncidentsPage />
    </RoleGate>
  ),
});

function IncidentsPage() {
  const { school } = useAuth();
  const incidents = useIncidents();
  const students = useStudents();
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [resolving, setResolving] = useState<Incident | null>(null);
  const resolve = useResolveIncident();
  const { profile } = useAuth();

  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students.data ?? []) m.set(s.id, fullName(s));
    return m;
  }, [students.data]);

  const all = incidents.data ?? [];
  const list = filter === "all" ? all : all.filter((i) => i.status === filter);
  const open = all.filter((i) => i.status === "open");

  async function reopen(i: Incident) {
    if (!profile) return;
    try {
      await resolve.mutateAsync({ id: i.id, note: "", resolverId: profile.id, reopen: true });
      toast.success("Incident reopened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reopen it.");
    }
  }

  return (
    <AppShell
      title="Safety incidents"
      greetingLine={`Reports from the bus for ${school?.name ?? "your school"}, tracked until they're resolved.`}
    >
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Open", value: open.length },
          { label: "High severity open", value: open.filter((i) => i.severity === "high").length },
          { label: "Resolved", value: all.length - open.length },
        ].map((s, i) => (
          <div key={s.label} className="scene-3d animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="glass-elevated silk lift-3d edge-lit h-full p-4 sm:p-5">
              <p className="type-label text-muted-foreground">{s.label}</p>
              <p className="type-kpi text-holo mt-3">{s.value}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter incidents">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "type-nav glass-soft min-h-11 rounded-full px-4 py-2 capitalize transition-all",
              filter === f ? "chip-gradient text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {incidents.isLoading ? (
        <div className="mt-4 grid gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-28 animate-pulse opacity-60" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<ShieldAlert className="size-6" aria-hidden="true" />}
          title={filter === "open" ? "Nothing open — all clear" : "No incidents here"}
          description="When an attendant reports a delay, breakdown or safety issue from the bus, it appears here."
        />
      ) : (
        <ul className="mt-4 grid gap-3">
          {list.map((i, idx) => (
            <li key={i.id} className="scene-3d animate-rise" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
              <div className="glass-elevated silk crest lift-3d edge-lit p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <TriangleAlert
                      className={cn(
                        "mt-1 size-5 shrink-0",
                        i.severity === "high" ? "text-destructive" : "text-warning",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="type-h3 text-foreground">{kindLabel[i.kind]}</p>
                      <p className="type-caption mt-1 text-muted-foreground">
                        {timeAgo(i.created_at)}
                        {i.student_id ? ` · ${names.get(i.student_id) ?? "Pupil"}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone={severityTone[i.severity]}>{severityLabel[i.severity]}</StatusPill>
                    <StatusPill tone={i.status === "open" ? "warning" : "success"}>
                      {i.status === "open" ? "Open" : "Resolved"}
                    </StatusPill>
                  </div>
                </div>
                <p className="type-body mt-3 text-foreground">{i.description}</p>
                {i.status === "resolved" && i.resolution_note && (
                  <p className="type-caption mt-3 border-t border-hairline pt-3 text-muted-foreground">
                    Resolved: {i.resolution_note}
                  </p>
                )}
                <div className="mt-4">
                  {i.status === "open" ? (
                    <Button size="sm" className="gap-2" onClick={() => setResolving(i)}>
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Mark resolved
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="gap-2" onClick={() => void reopen(i)}>
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolving && (
        <ResolveDialog
          incident={resolving}
          saving={resolve.isPending}
          onClose={() => setResolving(null)}
          onSave={async (note) => {
            if (!profile) return;
            try {
              await resolve.mutateAsync({ id: resolving.id, note, resolverId: profile.id });
              toast.success("Incident resolved");
              setResolving(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't resolve it.");
            }
          }}
        />
      )}
    </AppShell>
  );
}

function ResolveDialog({
  incident,
  saving,
  onClose,
  onSave,
}: {
  incident: Incident;
  saving: boolean;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-floating silk">
        <DialogHeader>
          <DialogTitle>Resolve incident</DialogTitle>
          <DialogDescription>{kindLabel[incident.kind]} · {incident.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="res-note">What was done (optional)</Label>
          <Textarea
            id="res-note"
            rows={3}
            placeholder="Replacement bus sent; all pupils reached school by 8:10."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={() => void onSave(note)}>
            {saving ? "Saving…" : "Mark resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
