import { createFileRoute } from "@tanstack/react-router";
import { Bus, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
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
  useAttendantOptions,
  useBuses,
  useDeleteBus,
  useSaveBus,
  type BusInput,
} from "@/lib/fleet";
import type { Bus as BusRow } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet & staff — School Transport" },
      {
        name: "description",
        content:
          "Register your school's buses, seat capacity and bus attendants in one place.",
      },
      { property: "og:title", content: "Fleet & staff — School Transport" },
      {
        property: "og:description",
        content: "Buses, capacity and attendants for your school.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <FleetPage />
    </RoleGate>
  ),
});

const emptyBus: BusInput = { plate_no: "", label: "", capacity: 40, status: "active" };

function FleetPage() {
  const { school } = useAuth();
  const buses = useBuses();
  const attendants = useAttendantOptions();
  const remove = useDeleteBus();
  const [editing, setEditing] = useState<{ bus?: BusRow } | null>(null);

  const list = buses.data ?? [];
  const seats = list.reduce((sum, b) => sum + (b.capacity ?? 0), 0);

  async function handleRemove(bus: BusRow) {
    try {
      await remove.mutateAsync(bus.id);
      toast.success(`${bus.label} removed from the fleet`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that bus.");
    }
  }

  return (
    <AppShell
      title="Fleet & staff"
      greetingLine={`Buses and attendants registered to ${school?.name ?? "your school"}.`}
      actions={
        <Button className="min-h-11 gap-2" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          Add bus
        </Button>
      }
    >
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Buses", value: String(list.length), hint: "In the fleet" },
          { label: "Seats", value: String(seats), hint: "Total capacity" },
          {
            label: "Attendants",
            value: String(attendants.data?.length ?? 0),
            hint: "Staff who can run trips",
          },
        ].map((stat, i) => (
          <div key={stat.label} className="scene-3d animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="glass-elevated silk lift-3d edge-lit h-full p-4 sm:p-5">
              <p className="type-label text-muted-foreground">{stat.label}</p>
              <p className="type-kpi text-holo mt-3">{stat.value}</p>
              <p className="type-caption mt-1.5 text-muted-foreground">{stat.hint}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="buses">
        <h2 id="buses" className="type-h2 text-chrome">
          Buses
        </h2>
        {buses.isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="glass h-32 animate-pulse opacity-60" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Bus className="size-6" aria-hidden="true" />}
            title="No buses yet"
            description="Add your first bus with its number plate and seat capacity, then it can be scheduled on a route."
            action={
              <Button className="gap-2" onClick={() => setEditing({})}>
                <Plus className="size-4" aria-hidden="true" />
                Add bus
              </Button>
            }
          />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.map((b, i) => (
              <li key={b.id} className="scene-3d animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <div className="glass-elevated silk crest lift-3d edge-lit h-full p-5">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="chip-gradient grid size-12 shrink-0 place-items-center rounded-2xl"
                    >
                      <Bus className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="type-h3 truncate text-foreground">{b.label}</h3>
                        <StatusPill tone={b.status === "active" ? "success" : "neutral"}>
                          {b.status === "active" ? "In service" : "Off the road"}
                        </StatusPill>
                      </div>
                      <p className="type-caption mt-1 text-muted-foreground">
                        {b.plate_no} · {b.capacity} seats
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => setEditing({ bus: b })}>
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => void handleRemove(b)}
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
      </section>

      <section className="mt-8" aria-labelledby="staff">
        <h2 id="staff" className="type-h2 text-chrome">
          Bus attendants
        </h2>
        <div className="glass-elevated silk mt-4 p-5">
          {(attendants.data ?? []).length === 0 ? (
            <p className="type-body-sm text-muted-foreground">
              No attendant accounts yet. Once an attendant signs up for {school?.name ?? "your school"},
              they appear here and can be put on a trip.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(attendants.data ?? []).map((a) => (
                <li key={a.id} className="glass-soft flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className="chip-obsidian grid size-9 shrink-0 place-items-center rounded-xl text-primary"
                  >
                    <UserRound className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="type-body-sm truncate text-foreground">{a.full_name}</p>
                    <p className="type-caption flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3.5" aria-hidden="true" />
                      {a.phone ?? "No phone on file"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {editing && (
        <BusDialog
          bus={editing.bus}
          schoolId={school?.id ?? ""}
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
}

function BusDialog({
  bus,
  schoolId,
  onClose,
}: {
  bus?: BusRow | undefined;
  schoolId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<BusInput>(
    bus
      ? {
          plate_no: bus.plate_no,
          label: bus.label,
          capacity: bus.capacity,
          status: bus.status === "active" ? "active" : "inactive",
        }
      : emptyBus,
  );
  const [error, setError] = useState<string | null>(null);
  const save = useSaveBus();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        ...(bus ? { id: bus.id } : {}),
        values: {
          ...form,
          plate_no: form.plate_no.trim().toUpperCase(),
          label: form.label.trim(),
          capacity: Number(form.capacity) || 1,
        },
        schoolId,
      });
      toast.success(bus ? "Bus updated" : "Bus added to the fleet");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-elevated sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="type-h2">{bus ? "Edit bus" : "Add bus"}</DialogTitle>
          <DialogDescription className="type-body-sm">
            Buses belong to your school only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="label">Bus name</Label>
            <Input
              id="label"
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Bus 01"
              className="min-h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="plate">Number plate</Label>
              <Input
                id="plate"
                required
                value={form.plate_no}
                onChange={(e) => setForm((f) => ({ ...f, plate_no: e.target.value }))}
                placeholder="KDJ 512A"
                className="min-h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Seats</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={120}
                required
                value={String(form.capacity)}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bus-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as BusInput["status"] }))}
            >
              <SelectTrigger id="bus-status" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">In service</SelectItem>
                <SelectItem value="inactive">Off the road</SelectItem>
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
            <Button type="submit" disabled={save.isPending} className="min-h-11">
              {save.isPending ? "Saving…" : bus ? "Save changes" : "Add bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
