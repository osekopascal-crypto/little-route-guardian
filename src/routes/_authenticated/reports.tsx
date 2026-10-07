import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { formatKes, methodLabel, summarise, useInvoices, usePayments } from "@/lib/fees";
import { kindLabel, severityLabel, useIncidents } from "@/lib/incidents";
import { downloadCsv, presetRange, useReportData } from "@/lib/reports";
import { fullName, useStudents } from "@/lib/students";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — School Transport" },
      {
        name: "description",
        content:
          "Attendance, trip punctuality, fee collection and safety reports for your school, with CSV downloads.",
      },
      { property: "og:title", content: "Reports — School Transport" },
      {
        property: "og:description",
        content: "Attendance, trips, fees and safety reports with Excel-ready downloads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <ReportsPage />
    </RoleGate>
  ),
});

type Preset = "week" | "month" | "term" | "custom";

function ReportsPage() {
  const { school } = useAuth();
  const [preset, setPreset] = useState<Preset>("month");
  const [range, setRange] = useState(presetRange("month"));
  const data = useReportData(range.from, range.to);
  const students = useStudents();
  const invoices = useInvoices();
  const payments = usePayments();
  const incidents = useIncidents();

  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students.data ?? []) m.set(s.id, fullName(s));
    return m;
  }, [students.data]);

  const riders = data.data?.riders ?? [];
  const trips = data.data?.trips ?? [];
  const stops = data.data?.stops ?? [];
  const routeName = new Map(trips.map((t) => [t.route_id, t.route?.name ?? "Route"]));

  // Attendance by pupil
  const byPupil = new Map<string, { boarded: number; dropped: number; absent: number }>();
  const byRoute = new Map<string, { boarded: number; dropped: number; absent: number }>();
  for (const r of riders) {
    const p = byPupil.get(r.student_id) ?? { boarded: 0, dropped: 0, absent: 0 };
    const rt = byRoute.get(r.trip?.route_id ?? "") ?? { boarded: 0, dropped: 0, absent: 0 };
    for (const agg of [p, rt]) {
      if (r.status === "on_board") agg.boarded++;
      if (r.status === "dropped") { agg.boarded++; agg.dropped++; }
      if (r.status === "absent") agg.absent++;
    }
    byPupil.set(r.student_id, p);
    if (r.trip) byRoute.set(r.trip.route_id, rt);
  }
  const pupilRows = [...byPupil.entries()]
    .map(([id, v]) => [names.get(id) ?? "Pupil", v.boarded, v.dropped, v.absent] as (string | number)[])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const routeRows = [...byRoute.entries()].map(
    ([id, v]) => [routeName.get(id) ?? "Route", v.boarded, v.dropped, v.absent] as (string | number)[],
  );

  // Trip punctuality
  const firstPickup = new Map<string, string>();
  for (const s of [...stops].sort((a, b) => a.sequence - b.sequence)) {
    const t = s.pickup_time ?? s.dropoff_time;
    if (t && !firstPickup.has(s.route_id)) firstPickup.set(s.route_id, t);
  }
  let onTime = 0;
  let measured = 0;
  const tripRows = trips
    .sort((a, b) => b.trip_date.localeCompare(a.trip_date))
    .map((t) => {
      let punctual = "—";
      const planned = firstPickup.get(t.route_id);
      if (t.started_at && planned) {
        const start = new Date(t.started_at);
        const [h, m] = planned.split(":").map(Number);
        const plan = new Date(start);
        plan.setHours(h ?? 0, m ?? 0, 0, 0);
        const late = Math.round((start.getTime() - plan.getTime()) / 60000);
        measured++;
        if (late <= 5) onTime++;
        punctual = late <= 5 ? "On time" : `${late} min late`;
      }
      return [t.trip_date, t.route?.name ?? "Route", t.direction === "to_school" ? "Morning" : "Afternoon", t.status, punctual];
    });
  const completed = trips.filter((t) => t.status === "completed").length;
  const cancelled = trips.filter((t) => t.status === "cancelled").length;

  // Fees
  const summaries = (invoices.data ?? []).map((i) => summarise(i, payments.data ?? []));
  const terms = new Map<string, { billed: number; paid: number; owed: number }>();
  for (const s of summaries) {
    if (s.state === "cancelled") continue;
    const t = terms.get(s.invoice.term_label) ?? { billed: 0, paid: 0, owed: 0 };
    t.billed += s.invoice.amount_kes;
    t.paid += s.paid;
    t.owed += s.balance;
    terms.set(s.invoice.term_label, t);
  }
  const termRows = [...terms.entries()].map(([k, v]) => [k, v.billed, v.paid, v.owed]);
  const owingRows = summaries
    .filter((s) => s.balance > 0 && s.state !== "cancelled")
    .map((s) => [names.get(s.invoice.student_id) ?? "Pupil", s.invoice.term_label, s.balance, s.invoice.due_date]);
  const methods = new Map<string, number>();
  for (const p of payments.data ?? []) methods.set(methodLabel[p.method], (methods.get(methodLabel[p.method]) ?? 0) + p.amount_kes);
  const methodRows = [...methods.entries()].map(([k, v]) => [k, v]);

  // Safety
  const inRange = (incidents.data ?? []).filter((i) => {
    const d = i.created_at.slice(0, 10);
    return d >= range.from && d <= range.to;
  });
  const safetyRows = inRange.map((i) => {
    const hrs = i.resolved_at
      ? ((new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 3_600_000).toFixed(1)
      : "Open";
    return [i.created_at.slice(0, 10), kindLabel[i.kind], severityLabel[i.severity], i.student_id ? names.get(i.student_id) ?? "" : "", hrs];
  });

  const tag = `${range.from}_to_${range.to}`;

  return (
    <AppShell
      title="Reports"
      greetingLine={`How transport is going at ${school?.name ?? "your school"}. Download any table to open in Excel.`}
    >
      <div className="glass-elevated silk flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
          {(["week", "month", "term", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPreset(p);
                if (p !== "custom") setRange(presetRange(p));
              }}
              aria-pressed={preset === p}
              className={cn(
                "type-nav glass-soft min-h-11 rounded-full px-4 py-2 transition-all",
                preset === p ? "chip-gradient text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {p === "week" ? "This week" : p === "month" ? "This month" : p === "term" ? "This term" : "Custom"}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap gap-3">
            <div className="grid gap-1">
              <Label htmlFor="r-from">From</Label>
              <Input id="r-from" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="r-to">To</Label>
              <Input id="r-to" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </div>
          </div>
        )}
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Trips run", value: String(completed), hint: `${cancelled} cancelled` },
          { label: "On-time starts", value: measured ? `${Math.round((onTime / measured) * 100)}%` : "—", hint: `${measured} trips measured` },
          { label: "Fees collected", value: formatKes(termRows.reduce((s, r) => s + Number(r[2]), 0)), hint: `${owingRows.length} pupils still owing` },
          { label: "Incidents", value: String(inRange.length), hint: `${inRange.filter((i) => i.status === "open").length} still open` },
        ].map((s, i) => (
          <div key={s.label} className="scene-3d animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="glass-elevated silk lift-3d edge-lit h-full p-4 sm:p-5">
              <p className="type-label text-muted-foreground">{s.label}</p>
              <p className="type-kpi text-holo mt-3 break-words">{s.value}</p>
              <p className="type-caption mt-1.5 text-muted-foreground">{s.hint}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ReportTable title="Attendance by pupil" header={["Pupil", "Boarded", "Dropped off", "Absent"]} rows={pupilRows} file={`attendance-pupils_${tag}.csv`} loading={data.isLoading} />
        <ReportTable title="Attendance by route" header={["Route", "Boarded", "Dropped off", "Absent"]} rows={routeRows} file={`attendance-routes_${tag}.csv`} loading={data.isLoading} />
        <ReportTable title="Trips" header={["Date", "Route", "Run", "Status", "Start"]} rows={tripRows} file={`trips_${tag}.csv`} loading={data.isLoading} />
        <ReportTable title="Fees by term (KES)" header={["Term", "Billed", "Collected", "Owed"]} rows={termRows} file="fees-by-term.csv" loading={invoices.isLoading} />
        <ReportTable title="Pupils with a balance" header={["Pupil", "Term", "Balance (KES)", "Due"]} rows={owingRows} file="fees-owing.csv" loading={invoices.isLoading} />
        <ReportTable title="Payments by method (KES)" header={["Method", "Total"]} rows={methodRows} file="payments-by-method.csv" loading={payments.isLoading} />
        <div className="lg:col-span-2">
          <ReportTable title="Safety incidents" header={["Date", "Type", "Severity", "Pupil", "Hours to resolve"]} rows={safetyRows} file={`incidents_${tag}.csv`} loading={incidents.isLoading} />
        </div>
      </div>
    </AppShell>
  );
}

function ReportTable({
  title,
  header,
  rows,
  file,
  loading,
}: {
  title: string;
  header: string[];
  rows: (string | number)[][];
  file: string;
  loading: boolean;
}) {
  return (
    <section className="glass-elevated silk crest p-5" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-h3 text-chrome">{title}</h2>
        <Button size="sm" variant="ghost" className="gap-2" disabled={rows.length === 0} onClick={() => downloadCsv(file, header, rows)}>
          <Download className="size-4" aria-hidden="true" />
          Download CSV
        </Button>
      </div>
      {loading ? (
        <div className="glass mt-4 h-24 animate-pulse opacity-60" />
      ) : rows.length === 0 ? (
        <p className="type-caption mt-4 text-muted-foreground">Nothing to show for this period.</p>
      ) : (
        <div className="mt-4 max-h-80 overflow-auto">
          <table className="type-body-sm w-full text-left">
            <thead className="type-label text-muted-foreground">
              <tr>
                {header.map((h) => (
                  <th key={h} scope="col" className="border-b border-hairline px-2 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-hairline/60 last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-2 text-foreground">
                      {typeof c === "number" ? c.toLocaleString("en-KE") : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
