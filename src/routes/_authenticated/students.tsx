import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  ageFrom,
  fullName,
  initialsOf,
  relationshipLabel,
  useDeleteStudent,
  useGuardianLinks,
  useLinkGuardian,
  useParentOptions,
  useSaveStudent,
  useStudents,
  useUnlinkGuardian,
  type Relationship,
  type Student,
  type StudentInput,
} from "@/lib/students";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Pupils — School Transport" },
      {
        name: "description",
        content:
          "Manage your school's pupil register and link each child to their parent accounts.",
      },
      { property: "og:title", content: "Pupils — School Transport" },
      {
        property: "og:description",
        content: "Pupil register and parent links for your school.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <StudentsPage />
    </RoleGate>
  ),
});

const emptyForm: StudentInput = {
  first_name: "",
  last_name: "",
  admission_no: "",
  grade_level: "",
  class_name: "",
  date_of_birth: "",
  gender: "",
  home_address: "",
  pickup_notes: "",
  status: "active",
};

function toForm(s: Student): StudentInput {
  return {
    first_name: s.first_name,
    last_name: s.last_name,
    admission_no: s.admission_no,
    grade_level: s.grade_level ?? "",
    class_name: s.class_name ?? "",
    date_of_birth: s.date_of_birth ?? "",
    gender: s.gender ?? "",
    home_address: s.home_address ?? "",
    pickup_notes: s.pickup_notes ?? "",
    status: s.status,
  };
}

function clean(form: StudentInput): StudentInput {
  const blankToNull = (v: string | null) => (v && v.trim() !== "" ? v.trim() : null);
  return {
    ...form,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    admission_no: form.admission_no.trim(),
    grade_level: blankToNull(form.grade_level),
    class_name: blankToNull(form.class_name),
    date_of_birth: blankToNull(form.date_of_birth),
    gender: blankToNull(form.gender),
    home_address: blankToNull(form.home_address),
    pickup_notes: blankToNull(form.pickup_notes),
  };
}

function StudentsPage() {
  const { school } = useAuth();
  const students = useStudents();
  const links = useGuardianLinks();
  const parents = useParentOptions();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<{ student?: Student } | null>(null);
  const [linking, setLinking] = useState<Student | null>(null);
  const [removing, setRemoving] = useState<Student | null>(null);

  const parentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of parents.data ?? []) map.set(p.id, p.full_name);
    return map;
  }, [parents.data]);

  const linksByStudent = useMemo(() => {
    const map = new Map<string, typeof links.data>();
    for (const l of links.data ?? []) {
      const list = map.get(l.student_id) ?? [];
      list.push(l);
      map.set(l.student_id, list);
    }
    return map;
  }, [links.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (students.data ?? []).filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return [s.first_name, s.last_name, s.admission_no, s.grade_level, s.class_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [students.data, query, statusFilter]);

  const total = students.data?.length ?? 0;
  const active = (students.data ?? []).filter((s) => s.status === "active").length;
  const linked = new Set((links.data ?? []).map((l) => l.student_id)).size;

  return (
    <AppShell
      title="Pupil register"
      greetingLine={`Every pupil below belongs only to ${school?.name ?? "your school"}.`}
      actions={
        <Button className="type-button min-h-11 gap-2" onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" />
          Add pupil
        </Button>
      }
    >
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Pupils", value: String(total), hint: "On the register" },
          { label: "Active", value: String(active), hint: "Travelling this term" },
          { label: "Family linked", value: `${linked}/${total}`, hint: "Have a parent account" },
        ].map((stat, i) => (
          <div key={stat.label} className="scene-3d animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="glass lift-3d edge-lit h-full p-4 sm:p-5">
              <p className="type-label text-muted-foreground">{stat.label}</p>
              <p className="type-kpi text-holo mt-3">{stat.value}</p>
              <p className="type-caption mt-1.5 text-muted-foreground">{stat.hint}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="glass-soft mt-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, admission number or class"
            aria-label="Search pupils"
            className="min-h-11 border-0 bg-transparent pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="min-h-11 w-full sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pupils</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {students.isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass h-40 animate-pulse opacity-60" />
          ))}
        </div>
      ) : students.error ? (
        <p
          role="alert"
          className="type-body-sm mt-6 flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/12 px-4 py-3 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          We couldn't load the pupil register. Please refresh and try again.
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Sparkles className="size-6" aria-hidden="true" />}
          title={total === 0 ? "Your register is empty" : "No pupils match that search"}
          description={
            total === 0
              ? "Add your first pupil to start building the register. Parents can be linked as soon as their account exists."
              : "Try a different name, admission number or class, or clear the status filter."
          }
          action={
            total === 0 ? (
              <Button className="gap-2" onClick={() => setEditing({})}>
                <Plus className="size-4" aria-hidden="true" />
                Add pupil
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map((s, i) => {
            const guardians = linksByStudent.get(s.id) ?? [];
            const age = ageFrom(s.date_of_birth);
            return (
              <li
                key={s.id}
                className="scene-3d animate-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <div className="glass lift-3d edge-lit sheen h-full p-5">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="chip-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-bold"
                    >
                      {initialsOf(s)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="type-h3 truncate text-foreground">{fullName(s)}</h3>
                        <StatusPill tone={s.status === "active" ? "success" : "neutral"}>
                          {s.status === "active" ? "Active" : "Inactive"}
                        </StatusPill>
                      </div>
                      <p className="type-caption mt-1 text-muted-foreground">
                        {s.admission_no}
                        {s.grade_level ? ` · ${s.grade_level}` : ""}
                        {s.class_name ? ` · ${s.class_name}` : ""}
                        {age !== null ? ` · ${age} yrs` : ""}
                      </p>

                      <div className="mt-3 space-y-1.5">
                        {s.home_address && (
                          <p className="type-caption flex items-start gap-2 text-muted-foreground">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                            {s.home_address}
                          </p>
                        )}
                        {s.pickup_notes && (
                          <p className="type-caption flex items-start gap-2 text-muted-foreground">
                            <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                            {s.pickup_notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {guardians.length === 0 ? (
                          <StatusPill tone="warning">No parent linked</StatusPill>
                        ) : (
                          guardians.map((g) => (
                            <StatusPill key={g.id} tone="info">
                              {parentName.get(g.guardian_id) ?? "Parent"} ·{" "}
                              {relationshipLabel[g.relationship]}
                            </StatusPill>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => setLinking(s)}
                    >
                      <Link2 className="size-4" aria-hidden="true" />
                      Family
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => setEditing({ student: s })}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => setRemoving(s)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <StudentDialog
          student={editing.student}
          onClose={() => setEditing(null)}
          schoolId={school?.id ?? ""}
        />
      )}
      {linking && (
        <GuardianDialog
          student={linking}
          onClose={() => setLinking(null)}
          schoolId={school?.id ?? ""}
        />
      )}
      {removing && <RemoveDialog student={removing} onClose={() => setRemoving(null)} />}
    </AppShell>
  );
}

function StudentDialog({
  student,
  schoolId,
  onClose,
}: {
  student?: Student | undefined;
  schoolId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<StudentInput>(student ? toForm(student) : emptyForm);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveStudent();

  function set<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        ...(student ? { id: student.id } : {}),
        values: clean(form),
        schoolId,
      });
      toast.success(student ? "Pupil updated" : "Pupil added to the register");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="type-h2">{student ? "Edit pupil" : "Add pupil"}</DialogTitle>
          <DialogDescription className="type-body-sm">
            Details are stored against your school only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name">
              <Input
                id="first_name"
                required
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                className="min-h-11"
              />
            </Field>
            <Field label="Last name" htmlFor="last_name">
              <Input
                id="last_name"
                required
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                className="min-h-11"
              />
            </Field>
            <Field label="Admission number" htmlFor="admission_no">
              <Input
                id="admission_no"
                required
                value={form.admission_no}
                onChange={(e) => set("admission_no", e.target.value)}
                className="min-h-11"
              />
            </Field>
            <Field label="Date of birth" htmlFor="date_of_birth">
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth ?? ""}
                onChange={(e) => set("date_of_birth", e.target.value)}
                className="min-h-11"
              />
            </Field>
            <Field label="Grade" htmlFor="grade_level">
              <Input
                id="grade_level"
                value={form.grade_level ?? ""}
                onChange={(e) => set("grade_level", e.target.value)}
                placeholder="Grade 4"
                className="min-h-11"
              />
            </Field>
            <Field label="Class" htmlFor="class_name">
              <Input
                id="class_name"
                value={form.class_name ?? ""}
                onChange={(e) => set("class_name", e.target.value)}
                placeholder="4 Blue"
                className="min-h-11"
              />
            </Field>
            <Field label="Gender" htmlFor="gender">
              <Select
                value={form.gender ?? ""}
                onValueChange={(v) => set("gender", v)}
              >
                <SelectTrigger id="gender" className="min-h-11">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as StudentInput["status"])}
              >
                <SelectTrigger id="status" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Home address" htmlFor="home_address">
            <Input
              id="home_address"
              value={form.home_address ?? ""}
              onChange={(e) => set("home_address", e.target.value)}
              className="min-h-11"
            />
          </Field>

          <Field label="Pick-up notes" htmlFor="pickup_notes">
            <Textarea
              id="pickup_notes"
              rows={3}
              value={form.pickup_notes ?? ""}
              onChange={(e) => set("pickup_notes", e.target.value)}
              placeholder="Anything an attendant should know at the gate."
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="type-body-sm flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/12 px-3 py-2.5 text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending} className="min-h-11 gap-2">
              {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {student ? "Save changes" : "Add pupil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GuardianDialog({
  student,
  schoolId,
  onClose,
}: {
  student: Student;
  schoolId: string;
  onClose: () => void;
}) {
  const parents = useParentOptions();
  const links = useGuardianLinks();
  const link = useLinkGuardian();
  const unlink = useUnlinkGuardian();

  const existing = (links.data ?? []).filter((l) => l.student_id === student.id);
  const available = (parents.data ?? []).filter(
    (p) => !existing.some((l) => l.guardian_id === p.id),
  );

  const [guardianId, setGuardianId] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("guardian");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!guardianId) return;
    setError(null);
    try {
      await link.mutateAsync({
        studentId: student.id,
        guardianId,
        relationship,
        isPrimary: existing.length === 0,
        schoolId,
      });
      setGuardianId("");
      toast.success("Parent linked to pupil");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="type-h2">Family links</DialogTitle>
          <DialogDescription className="type-body-sm">
            Parents linked to {fullName(student)} will see this child's journeys.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {existing.length === 0 && (
            <li className="type-body-sm glass-soft px-4 py-3 text-muted-foreground">
              No parent accounts linked yet.
            </li>
          )}
          {existing.map((l) => (
            <li key={l.id} className="glass-soft flex items-center gap-3 px-4 py-3">
              <Users className="size-4 shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="type-body-sm truncate text-foreground">
                  {parents.data?.find((p) => p.id === l.guardian_id)?.full_name ?? "Parent"}
                </p>
                <p className="type-caption text-muted-foreground">
                  {relationshipLabel[l.relationship]}
                  {l.is_primary ? " · primary contact" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove link"
                disabled={unlink.isPending}
                onClick={() => void unlink.mutateAsync(l.id).then(() => toast.success("Link removed"))}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="glass-soft space-y-3 p-4">
          <p className="type-label text-muted-foreground">Link a parent account</p>
          {available.length === 0 ? (
            <p className="type-body-sm text-muted-foreground">
              Every parent account at your school is already linked to this pupil.
            </p>
          ) : (
            <>
              <Select value={guardianId} onValueChange={setGuardianId}>
                <SelectTrigger className="min-h-11" aria-label="Parent account">
                  <SelectValue placeholder="Choose a parent" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={relationship}
                onValueChange={(v) => setRelationship(v as Relationship)}
              >
                <SelectTrigger className="min-h-11" aria-label="Relationship">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="min-h-11 w-full gap-2"
                disabled={!guardianId || link.isPending}
                onClick={add}
              >
                {link.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="size-4" aria-hidden="true" />
                )}
                Link parent
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className="type-body-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ student, onClose }: { student: Student; onClose: () => void }) {
  const remove = useDeleteStudent();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="type-h2">Remove {fullName(student)}?</DialogTitle>
          <DialogDescription className="type-body-sm">
            This deletes the pupil and any family links from your register. It can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Keep pupil
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            className="gap-2"
            onClick={async () => {
              await remove.mutateAsync(student.id);
              toast.success("Pupil removed");
              onClose();
            }}
          >
            {remove.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Remove pupil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="type-label text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
