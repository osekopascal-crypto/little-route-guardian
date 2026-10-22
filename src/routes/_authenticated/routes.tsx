import { createFileRoute } from "@tanstack/react-router";
import { Clock, LocateFixed, MapPin, Pencil, Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { resolveLocation } from "@/lib/locate.functions";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  useDeleteRoute,
  useDeleteStop,
  useRoutesAdmin,
  useSaveRoute,
  useSaveStop,
  useStops,
  type RouteAdmin,
  type RouteInput,
  type StopInput,
} from "@/lib/fleet";
import { shortTime, type RouteStop } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/routes")({
  head: () => ({
    meta: [
      { title: "Routes & stops — School Transport" },
      {
        name: "description",
        content:
          "Build each transport corridor: name the route and set its stops, pickup and drop-off times.",
      },
      { property: "og:title", content: "Routes & stops — School Transport" },
      {
        property: "og:description",
        content: "Corridors, stops and timings for your school buses.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <RoutesPage />
    </RoleGate>
  ),
});

const emptyRoute: RouteInput = { name: "", code: "", corridor: "", status: "active" };

function RoutesPage() {
  const { school } = useAuth();
  const routes = useRoutesAdmin();
  const removeRoute = useDeleteRoute();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<{ route?: RouteAdmin } | null>(null);

  const list = routes.data ?? [];
  useEffect(() => {
    if (!selected && list[0]) setSelected(list[0].id);
  }, [list, selected]);

  const current = list.find((r) => r.id === selected);

  async function handleRemove(route: RouteAdmin) {
    try {
      await removeRoute.mutateAsync(route.id);
      if (selected === route.id) setSelected(undefined);
      toast.success(`${route.name} removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that route.");
    }
  }

  return (
    <AppShell
      title="Routes & stops"
      greetingLine={`Corridors your buses serve for ${school?.name ?? "your school"}.`}
      actions={
        <Button className="min-h-11 gap-2" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          Add route
        </Button>
      }
    >
      {routes.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-32 animate-pulse opacity-60" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<RouteIcon className="size-6" aria-hidden="true" />}
          title="No routes yet"
          description="Create your first corridor — for example Kiambu – Ndumberi — then add its stops in order."
          action={
            <Button className="gap-2" onClick={() => setEditing({})}>
              <Plus className="size-4" aria-hidden="true" />
              Add route
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <section aria-labelledby="route-list">
            <h2 id="route-list" className="type-h2 text-chrome">
              Corridors
            </h2>
            <ul className="mt-4 space-y-2.5">
              {list.map((r, i) => (
                <li key={r.id} className="scene-3d animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                  <div
                    className={
                      r.id === selected
                        ? "glass-gold silk crest edge-lit p-5"
                        : "glass-elevated silk lift-3d p-5"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(r.id)}
                      className="w-full text-left"
                      aria-pressed={r.id === selected}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="type-h3 truncate text-foreground">{r.name}</h3>
                        <StatusPill tone={r.status === "active" ? "success" : "neutral"}>
                          {r.status === "active" ? "Running" : "Paused"}
                        </StatusPill>
                      </div>
                      <p className="type-caption mt-1 text-muted-foreground">
                        {r.code}
                        {r.corridor ? ` · ${r.corridor}` : ""}
                      </p>
                    </button>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setEditing({ route: r })}>
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => void handleRemove(r)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {current && <StopsPanel route={current} schoolId={school?.id ?? ""} />}
        </div>
      )}

      {editing && (
        <RouteDialog route={editing.route} schoolId={school?.id ?? ""} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}

function StopsPanel({ route, schoolId }: { route: RouteAdmin; schoolId: string }) {
  const stops = useStops(route.id);
  const removeStop = useDeleteStop();
  const [editing, setEditing] = useState<{ stop?: RouteStop } | null>(null);
  const list = stops.data ?? [];

  async function handleRemove(stop: RouteStop) {
    try {
      await removeStop.mutateAsync({ id: stop.id, routeId: route.id });
      toast.success(`${stop.name} removed from ${route.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that stop.");
    }
  }

  return (
    <section aria-labelledby="stops">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="stops" className="type-h2 text-chrome">
          Stops on {route.name}
        </h2>
        <Button size="sm" className="gap-2" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          Add stop
        </Button>
      </div>

      <div className="glass-elevated silk crest edge-lit mt-4 p-5">
        {stops.isLoading ? (
          <div className="h-24 animate-pulse opacity-60" />
        ) : list.length === 0 ? (
          <p className="type-body-sm text-muted-foreground">
            No stops yet. Add them in the order the bus travels — the first stop is where the
            run begins.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {list.map((s) => (
              <li key={s.id} className="glass-soft flex items-start gap-3 px-4 py-3.5">
                <span aria-hidden="true" className="stop-node mt-1.5 size-2.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="type-body-sm font-semibold text-foreground">
                    {s.sequence}. {s.name}
                  </p>
                  <p className="type-caption flex flex-wrap items-center gap-x-3 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {shortTime(s.pickup_time) ?? "—"} pickup · {shortTime(s.dropoff_time) ?? "—"} drop-off
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ stop: s })}>
                    <Pencil className="size-4" aria-hidden="true" />
                    <span className="sr-only">Edit {s.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleRemove(s)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sr-only">Remove {s.name}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div aria-hidden="true" className="route-line mt-6 w-full opacity-70" />
      </div>

      {editing && (
        <StopDialog
          routeId={route.id}
          schoolId={schoolId}
          stop={editing.stop}
          nextSequence={(list[list.length - 1]?.sequence ?? 0) + 1}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function RouteDialog({
  route,
  schoolId,
  onClose,
}: {
  route?: RouteAdmin | undefined;
  schoolId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RouteInput>(
    route
      ? { name: route.name, code: route.code, corridor: route.corridor ?? "", status: route.status }
      : emptyRoute,
  );
  const [error, setError] = useState<string | null>(null);
  const save = useSaveRoute();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        ...(route ? { id: route.id } : {}),
        values: {
          ...form,
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          corridor: form.corridor && form.corridor.trim() !== "" ? form.corridor.trim() : null,
        },
        schoolId,
      });
      toast.success(route ? "Route updated" : "Route created");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-elevated sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="type-h2">{route ? "Edit route" : "Add route"}</DialogTitle>
          <DialogDescription className="type-body-sm">
            Give the corridor a clear name families will recognise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="route-name">Route name</Label>
            <Input
              id="route-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Kiambu – Ndumberi"
              className="min-h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="route-code">Short code</Label>
              <Input
                id="route-code"
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="R-01"
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="route-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as RouteInput["status"] }))}
              >
                <SelectTrigger id="route-status" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Running</SelectItem>
                  <SelectItem value="inactive">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="corridor">Area served</Label>
            <Input
              id="corridor"
              value={form.corridor ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, corridor: e.target.value }))}
              placeholder="Kiambu town, Ndumberi"
              className="min-h-11"
            />
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
            <Button type="submit" disabled={save.isPending} className="min-h-11">
              {save.isPending ? "Saving…" : route ? "Save changes" : "Add route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StopDialog({
  routeId,
  schoolId,
  stop,
  nextSequence,
  onClose,
}: {
  routeId: string;
  schoolId: string;
  stop?: RouteStop | undefined;
  nextSequence: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<StopInput>(
    stop
      ? {
          name: stop.name,
          sequence: stop.sequence,
          lat: stop.lat,
          lng: stop.lng,
          pickup_time: stop.pickup_time ?? "",
          dropoff_time: stop.dropoff_time ?? "",
        }
      : {
          name: "",
          sequence: nextSequence,
          lat: -1.1714,
          lng: 36.8356,
          pickup_time: "",
          dropoff_time: "",
        },
  );
  const [error, setError] = useState<string | null>(null);
  const save = useSaveStop();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        ...(stop ? { id: stop.id } : {}),
        routeId,
        schoolId,
        values: {
          ...form,
          name: form.name.trim(),
          sequence: Number(form.sequence) || 1,
          lat: Number(form.lat),
          lng: Number(form.lng),
          pickup_time: form.pickup_time && form.pickup_time !== "" ? form.pickup_time : null,
          dropoff_time: form.dropoff_time && form.dropoff_time !== "" ? form.dropoff_time : null,
        },
      });
      toast.success(stop ? "Stop updated" : "Stop added");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-elevated max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="type-h2">{stop ? "Edit stop" : "Add stop"}</DialogTitle>
          <DialogDescription className="type-body-sm">
            Stops are visited in order. Times are what families see on the schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="stop-name">Stop name</Label>
            <Input
              id="stop-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ndumberi Shopping Centre"
              className="min-h-11"
            />
          </div>
          <StopLocator
            onFound={(lat, lng, label) =>
              setForm((f) => ({ ...f, lat, lng, name: f.name.trim() === "" && label ? label.split(",")[0]! : f.name }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="stop-seq">Order</Label>
              <Input
                id="stop-seq"
                type="number"
                min={1}
                required
                value={String(form.sequence)}
                onChange={(e) => setForm((f) => ({ ...f, sequence: Number(e.target.value) }))}
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stop-lat">Latitude</Label>
              <Input
                id="stop-lat"
                type="number"
                step="any"
                required
                value={String(form.lat)}
                onChange={(e) => setForm((f) => ({ ...f, lat: Number(e.target.value) }))}
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stop-lng">Longitude</Label>
              <Input
                id="stop-lng"
                type="number"
                step="any"
                required
                value={String(form.lng)}
                onChange={(e) => setForm((f) => ({ ...f, lng: Number(e.target.value) }))}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pickup">Morning pickup</Label>
              <Input
                id="pickup"
                type="time"
                value={form.pickup_time ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, pickup_time: e.target.value }))}
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dropoff">Afternoon drop-off</Label>
              <Input
                id="dropoff"
                type="time"
                value={form.dropoff_time ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, dropoff_time: e.target.value }))}
                className="min-h-11"
              />
            </div>
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
            <Button type="submit" disabled={save.isPending} className="min-h-11">
              {save.isPending ? "Saving…" : stop ? "Save changes" : "Add stop"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StopLocator({ onFound }: { onFound: (lat: number, lng: number, label: string | null) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const resolve = useServerFn(resolveLocation);

  async function find() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await resolve({ data: { text } });
      onFound(r.lat, r.lng, r.label);
      toast.success("Location found — check the pin, then save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't find that place.");
    } finally {
      setBusy(false);
    }
  }

  function here() {
    if (!navigator.geolocation) {
      toast.error("This device can't share its location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        onFound(Number(p.coords.latitude.toFixed(6)), Number(p.coords.longitude.toFixed(6)), null);
        toast.success("Using where you're standing now");
      },
      () => {
        setBusy(false);
        toast.error("Location permission was refused.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="glass-soft grid gap-2 p-3">
      <Label htmlFor="stop-find">Find the place</Label>
      <p className="type-caption text-muted-foreground">
        Paste a Google Maps link (Share → Copy link), or type a place name.
      </p>
      <div className="flex gap-2">
        <Input
          id="stop-find"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void find();
            }
          }}
          placeholder="https://maps.app.goo.gl/…"
          className="min-h-11"
        />
        <Button type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={() => void find()}>
          {busy ? "…" : "Find"}
        </Button>
      </div>
      <Button type="button" variant="ghost" className="min-h-11 justify-start gap-2" disabled={busy} onClick={here}>
        <LocateFixed className="size-4" aria-hidden="true" />
        I'm standing at this stop — use my location
      </Button>
    </div>
  );
}
