import { createFileRoute } from "@tanstack/react-router";
import { Bus, CalendarClock, ListChecks, Pencil, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  dayLabel,
  directionLabel,
  todayISO,
  useAddRider,
  useLoadLastRoster,
  useAttendantOptions,
  useBuses,
  useDeleteTrip,
  useRemoveRider,
  useRoutesAdmin,
  useSaveTrip,
  useStops,
  useTripRoster,
  useTrips,
  type TripInput,
} from "@/lib/fleet";
import { fullName, initialsOf, useStudents } from "@/lib/students";
import { tripStatusLabel, type Trip, type TripStatus } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "Trip schedule — School Transport" },
      {
        name: "description",
        content:
          "Schedule daily bus runs: pick the route, bus and attendant, then set who rides on each trip.",
      },
      { property: "og:title", content: "Trip schedule — School Transport" },
      {
        property: "og:description",
        content: "Plan daily bus runs and their riders.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <TripsPage />
    </RoleGate>
  ),
});

function TripsPage() {
  const { school } = useAuth();
  const trips = useTrips();
  const routes = useRoutesAdmin();
  const buses = useBuses();
  const attendants = useAttendantOptions();
  const remove = useDeleteTrip();

  const [editing, setEditing] = useState<{ trip?: Trip } | null>(null);
  const [roster, setRoster] = useState<Trip | null>(null);
  const [when, setWhen] = useState<"upcoming" | "all">("upcoming");

  const attendantName = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attendants.data ?? []) map.set(a.id, a.full_name);
    return map;
  }, [attendants.data]);

  const today = todayISO();
  const list = (trips.data ?? []).filter((t) => (when === "all" ? true : t.trip_date >= today));

  async function handleRemove(trip: Trip) {
    try {
      await remove.mutateAsync(trip.id);
      toast.success("Trip removed from the schedule");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that trip.");
    }
  }

  const ready = (routes.data ?? []).length > 0;

  return (
    <AppShell
      title="Trip schedule"
      greetingLine={`Plan the daily runs for ${school?.name ?? "your school"} and choose who rides.`}
      actions={
        <Button className="min-h-11 gap-2" onClick={() => setEditing({})} disabled={!ready}>
          <Plus className="size-4" aria-hidden="true" />
          Schedule trip
        </Button>
      }
    >
      <div className="glass-soft flex flex-wrap items-center gap-3 p-3">
        <Select value={when} onValueChange={(v) => setWhen(v as typeof when)}>
          <SelectTrigger className="min-h-11 w-full sm:w-56" aria-label="Filter trips">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Today and upcoming</SelectItem>
            <SelectItem value="all">Everything scheduled</SelectItem>
          </SelectContent>
        </Select>
        <p className="type-caption text-muted-foreground">
          {list.length} run{list.length === 1 ? "" : "s"} shown
        </p>
      </div>

      {!ready && !routes.isLoading ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarClock className="size-6" aria-hidden="true" />}
          title="Add a route first"
          description="A trip needs a route with stops. Create a corridor on Routes & stops, then come back to schedule the run."
        />
      ) : trips.isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-36 animate-pulse opacity-60" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarClock className="size-6" aria-hidden="true" />}
          title="Nothing scheduled"
          description="Schedule a morning or afternoon run, assign a bus and attendant, then add the pupils who travel on it."
          action={
            <Button className="gap-2" onClick={() => setEditing({})}>
              <Plus className="size-4" aria-hidden="true" />
              Schedule trip
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {list.map((t, i) => (
            <li key={t.id} className="scene-3d animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <div className="glass-elevated silk crest lift-3d edge-lit h-full p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="type-h3 truncate text-foreground">
                    {t.route?.name ?? "Route"}
                  </h3>
                  <StatusPill
                    tone={
                      t.status === "in_progress"
                        ? "success"
                        : t.status === "completed"
                          ? "info"
                          : t.status === "cancelled"
                            ? "error"
                            : "neutral"
                    }
                  >
                    {tripStatusLabel[t.status]}
                  </StatusPill>
                </div>
                <p className="type-caption mt-1 text-muted-foreground">
                  {dayLabel(t.trip_date)} · {directionLabel[t.direction]}
                </p>

                <div className="mt-4 space-y-1.5">
                  <p className="type-caption flex items-center gap-2 text-muted-foreground">
                    <Bus className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                    {t.bus ? `${t.bus.label} · ${t.bus.plate_no}` : "No bus assigned yet"}
                  </p>
                  <p className="type-caption flex items-center gap-2 text-muted-foreground">
                    <Users className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                    {t.attendant_id
                      ? (attendantName.get(t.attendant_id) ?? "Attendant assigned")
                      : "No attendant assigned yet"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => setRoster(t)}>
                    <UserPlus className="size-4" aria-hidden="true" />
                    Riders
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => setEditing({ trip: t })}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => void handleRemove(t)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <TripDialog
          trip={editing.trip}
          schoolId={school?.id ?? ""}
          routes={(routes.data ?? []).map((r) => ({ id: r.id, name: r.name }))}
          buses={(buses.data ?? []).map((b) => ({ id: b.id, label: `${b.label} · ${b.plate_no}` }))}
          attendants={(attendants.data ?? []).map((a) => ({ id: a.id, label: a.full_name }))}
          onClose={() => setEditing(null)}
        />
      )}
      {roster && (
        <RosterDialog trip={roster} schoolId={school?.id ?? ""} onClose={() => setRoster(null)} />
      )}
    </AppShell>
  );
}

const NONE = "none";

function TripDialog({
  trip,
  schoolId,
  routes,
  buses,
  attendants,
  onClose,
}: {
  trip?: Trip | undefined;
  schoolId: string;
  routes: { id: string; name: string }[];
  buses: { id: string; label: string }[];
  attendants: { id: string; label: string }[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<TripInput>(
    trip
      ? {
          route_id: trip.route_id,
          bus_id: trip.bus_id,
          attendant_id: trip.attendant_id,
          trip_date: trip.trip_date,
          direction: trip.direction,
          status: trip.status,
        }
      : {
          route_id: routes[0]?.id ?? "",
          bus_id: null,
          attendant_id: null,
          trip_date: todayISO(),
          direction: "to_school",
          status: "planned",
        },
  );
  const [error, setError] = useState<string | null>(null);
  const save = useSaveTrip();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ ...(trip ? { id: trip.id } : {}), values: form, schoolId });
      toast.success(trip ? "Trip updated" : "Trip scheduled");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-elevated max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="type-h2">{trip ? "Edit trip" : "Schedule trip"}</DialogTitle>
          <DialogDescription className="type-body-sm">
            The attendant you choose is the only person who can run this trip on the road.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="trip-route">Route</Label>
            <Select
              value={form.route_id}
              onValueChange={(v) => setForm((f) => ({ ...f, route_id: v }))}
            >
              <SelectTrigger id="trip-route" className="min-h-11">
                <SelectValue placeholder="Choose a route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="trip-date">Date</Label>
              <Input
                id="trip-date"
                type="date"
                required
                value={form.trip_date}
                onChange={(e) => setForm((f) => ({ ...f, trip_date: e.target.value }))}
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trip-direction">Run</Label>
              <Select
                value={form.direction}
                onValueChange={(v) => setForm((f) => ({ ...f, direction: v as TripInput["direction"] }))}
              >
                <SelectTrigger id="trip-direction" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_school">Morning run to school</SelectItem>
                  <SelectItem value="from_school">Afternoon run home</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trip-bus">Bus</Label>
            <Select
              value={form.bus_id ?? NONE}
              onValueChange={(v) => setForm((f) => ({ ...f, bus_id: v === NONE ? null : v }))}
            >
              <SelectTrigger id="trip-bus" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not assigned yet</SelectItem>
                {buses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trip-attendant">Attendant</Label>
            <Select
              value={form.attendant_id ?? NONE}
              onValueChange={(v) => setForm((f) => ({ ...f, attendant_id: v === NONE ? null : v }))}
            >
              <SelectTrigger id="trip-attendant" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not assigned yet</SelectItem>
                {attendants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trip-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as TripStatus }))}
            >
              <SelectTrigger id="trip-status" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Not started yet</SelectItem>
                <SelectItem value="in_progress">On the road</SelectItem>
                <SelectItem value="completed">Journey finished</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" className="type-body-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !form.route_id} className="min-h-11">
              {save.isPending ? "Saving…" : trip ? "Save changes" : "Schedule trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RosterDialog({
  trip,
  schoolId,
  onClose,
}: {
  trip: Trip;
  schoolId: string;
  onClose: () => void;
}) {
  const roster = useTripRoster(trip.id);
  const students = useStudents();
  const stops = useStops(trip.route_id);
  const add = useAddRider();
  const remove = useRemoveRider();
  const loadLast = useLoadLastRoster();

  async function handleLoadLast() {
    try {
      const n = await loadLast.mutateAsync({ tripId: trip.id, routeId: trip.route_id, schoolId });
      toast.success(n === 0 ? "Everyone from the last run is already here" : `${n} pupils loaded from the last run`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load the usual pupils.");
    }
  }

  const [studentId, setStudentId] = useState("");
  const [stopId, setStopId] = useState(NONE);

  const riders = roster.data ?? [];
  const taken = new Set(riders.map((r) => r.student_id));
  const available = (students.data ?? []).filter((s) => !taken.has(s.id) && s.status === "active");
  const stopName = new Map((stops.data ?? []).map((s) => [s.id, s.name]));

  async function handleAdd() {
    if (!studentId) return;
    try {
      await add.mutateAsync({
        tripId: trip.id,
        studentId,
        stopId: stopId === NONE ? null : stopId,
        schoolId,
      });
      setStudentId("");
      toast.success("Pupil added to this run");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that pupil.");
    }
  }

  async function handleRemove(id: string, name: string) {
    try {
      await remove.mutateAsync({ id, tripId: trip.id });
      toast.success(`${name} removed from this run`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that pupil.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-elevated max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="type-h2">Who rides this run</DialogTitle>
          <DialogDescription className="type-body-sm">
            {trip.route?.name ?? "Route"} · {dayLabel(trip.trip_date)} ·{" "}
            {directionLabel[trip.direction]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={handleLoadLast}
            disabled={loadLast.isPending || !schoolId}
          >
            <ListChecks className="h-4 w-4" />
            {loadLast.isPending ? "Loading pupils…" : "Load usual pupils from last run"}
          </Button>
          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="rider">Pupil</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="rider" className="min-h-11">
                  <SelectValue placeholder="Choose a pupil" />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <SelectItem value="none-left" disabled>
                      Every active pupil is already on this run
                    </SelectItem>
                  ) : (
                    available.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s)} · {s.admission_no}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rider-stop">Stop</Label>
              <Select value={stopId} onValueChange={setStopId}>
                <SelectTrigger id="rider-stop" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No stop yet</SelectItem>
                  {(stops.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sequence}. {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="min-h-11 gap-2"
              disabled={!studentId || add.isPending}
              onClick={() => void handleAdd()}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </div>

          <div aria-hidden="true" className="route-line w-full opacity-70" />

          {roster.isLoading ? (
            <div className="h-20 animate-pulse opacity-60" />
          ) : riders.length === 0 ? (
            <p className="type-body-sm text-muted-foreground">
              Nobody is on this run yet. Add pupils above and their families will be able to
              follow the bus.
            </p>
          ) : (
            <ul className="space-y-2">
              {riders.map((r) => (
                <li key={r.id} className="glass-soft flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className="chip-gradient grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold"
                  >
                    {initialsOf(r.student)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="type-body-sm truncate text-foreground">{fullName(r.student)}</p>
                    <p className="type-caption text-muted-foreground">
                      {r.stop_id ? (stopName.get(r.stop_id) ?? "Stop") : "No stop set"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleRemove(r.id, fullName(r.student))}
                  >
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">Remove {fullName(r.student)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose} className="min-h-11">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
