import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Pencil, Plus, Printer, Receipt, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { ReceiptVoucher } from "@/components/receipt-voucher";
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
  formatDueDate,
  formatKes,
  methodLabel,
  stateLabel,
  summarise,
  useDeleteInvoice,
  useInvoices,
  usePayments,
  useRecordPayment,
  useSaveInvoice,
  type FeeInvoice,
  type FeePayment,
  type InvoiceInput,
  type InvoiceSummary,
  type PaymentMethod,
} from "@/lib/fees";
import { fullName, useStudents } from "@/lib/students";

export const Route = createFileRoute("/_authenticated/fees")({
  head: () => ({
    meta: [
      { title: "Transport fees — School Transport" },
      {
        name: "description",
        content:
          "Termly transport fees for each pupil: what is due, what has been paid by M-Pesa, cash or bank, and the balance left.",
      },
      { property: "og:title", content: "Transport fees — School Transport" },
      {
        property: "og:description",
        content: "Termly bus fees, payments and balances for each pupil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeesPage,
});

const today = () => new Date().toISOString().slice(0, 10);

const emptyInvoice = (): InvoiceInput => ({
  student_id: "",
  term_label: "",
  amount_kes: 0,
  due_date: today(),
  notes: null,
  status: "open",
});

const toneByState: Record<InvoiceSummary["state"], "success" | "neutral" | "warning" | "error"> = {
  paid: "success",
  part: "warning",
  due: "neutral",
  overdue: "error",
  cancelled: "neutral",
};

function FeesPage() {
  const { profile, school } = useAuth();
  const isAdmin = profile?.role === "admin";

  const invoices = useInvoices();
  const payments = usePayments();
  const students = useStudents();
  const saveInvoice = useSaveInvoice();
  const removeInvoice = useDeleteInvoice();
  const recordPayment = useRecordPayment();

  const [invoiceDialog, setInvoiceDialog] = useState<{ invoice?: FeeInvoice } | null>(null);
  const [payDialog, setPayDialog] = useState<InvoiceSummary | null>(null);
  const [receipt, setReceipt] = useState<{ payment: FeePayment; invoice: FeeInvoice } | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students.data ?? []) map.set(s.id, fullName(s));
    return map;
  }, [students.data]);

  const rows = useMemo(
    () => (invoices.data ?? []).map((inv) => summarise(inv, payments.data ?? [])),
    [invoices.data, payments.data],
  );

  const billed = rows
    .filter((r) => r.state !== "cancelled")
    .reduce((sum, r) => sum + r.invoice.amount_kes, 0);
  const collected = rows.reduce((sum, r) => sum + r.paid, 0);
  const outstanding = rows
    .filter((r) => r.state !== "cancelled")
    .reduce((sum, r) => sum + r.balance, 0);

  async function handleRemove(inv: FeeInvoice) {
    try {
      await removeInvoice.mutateAsync(inv.id);
      toast.success("Fee record removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that record.");
    }
  }

  return (
    <AppShell
      title={isAdmin ? "Transport fees" : "Bus fees"}
      greetingLine={
        isAdmin
          ? `Termly bus fees, payments and balances for ${school?.name ?? "your school"}.`
          : "What you owe for the school bus, what you've paid and the balance left."
      }
      actions={
        isAdmin ? (
          <Button className="min-h-11 gap-2" onClick={() => setInvoiceDialog({})}>
            <Plus className="size-4" aria-hidden="true" />
            Add fee
          </Button>
        ) : undefined
      }
    >
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: isAdmin ? "Billed" : "Total fees", value: formatKes(billed) },
          { label: "Paid", value: formatKes(collected) },
          { label: "Balance", value: formatKes(outstanding) },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="scene-3d animate-rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="glass-elevated silk lift-3d edge-lit h-full p-4 sm:p-5">
              <p className="type-label text-muted-foreground">{stat.label}</p>
              <p className="type-kpi text-holo mt-3 break-words">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="fee-records">
        <h2 id="fee-records" className="type-h2 text-chrome">
          {isAdmin ? "Fee records" : "Your fees"}
        </h2>

        {invoices.isLoading ? (
          <div className="mt-4 grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="glass h-28 animate-pulse opacity-60" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Receipt className="size-6" aria-hidden="true" />}
            title={isAdmin ? "No fees recorded yet" : "Nothing to pay right now"}
            description={
              isAdmin
                ? "Add a termly bus fee for a pupil, then record each M-Pesa, cash or bank payment against it."
                : "When the school sets your child's bus fee for the term it will appear here with the balance."
            }
            action={
              isAdmin ? (
                <Button className="gap-2" onClick={() => setInvoiceDialog({})}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add fee
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="mt-4 grid gap-3">
            {rows.map((row, i) => {
              const inv = row.invoice;
              const history = (payments.data ?? []).filter((p) => p.invoice_id === inv.id);
              return (
                <li
                  key={inv.id}
                  className="scene-3d animate-rise"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <div className="glass-elevated silk crest lift-3d edge-lit p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="type-h3 truncate text-foreground">
                          {nameById.get(inv.student_id) ?? "Pupil"}
                        </p>
                        <p className="type-caption mt-1 text-muted-foreground">
                          {inv.term_label} · due {formatDueDate(inv.due_date)}
                        </p>
                      </div>
                      <StatusPill tone={toneByState[row.state]}>{stateLabel[row.state]}</StatusPill>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="type-label text-muted-foreground">Fee</p>
                        <p className="type-body mt-1 font-semibold text-foreground">
                          {formatKes(inv.amount_kes)}
                        </p>
                      </div>
                      <div>
                        <p className="type-label text-muted-foreground">Paid</p>
                        <p className="type-body mt-1 font-semibold text-foreground">
                          {formatKes(row.paid)}
                        </p>
                      </div>
                      <div>
                        <p className="type-label text-muted-foreground">Balance</p>
                        <p className="type-body mt-1 font-semibold text-foreground">
                          {formatKes(row.balance)}
                        </p>
                      </div>
                    </div>

                    {inv.notes && (
                      <p className="type-caption mt-3 text-muted-foreground">{inv.notes}</p>
                    )}

                    {history.length > 0 && (
                      <ul className="mt-4 grid gap-2 border-t border-hairline pt-3">
                        {history.map((p) => (
                          <li
                            key={p.id}
                            className="type-caption flex flex-wrap items-center justify-between gap-2 text-muted-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <Banknote className="size-3.5" aria-hidden="true" />
                              {formatKes(p.amount_kes)} · {methodLabel[p.method]}
                              {p.reference ? ` · ${p.reference}` : ""}
                            </span>
                            <span className="flex items-center gap-2">
                              {new Date(p.paid_at).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                              })}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 px-2"
                                onClick={() => setReceipt({ payment: p, invoice: inv })}
                              >
                                <Printer className="size-3.5" aria-hidden="true" />
                                Receipt
                              </Button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {isAdmin ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={row.balance === 0 || inv.status === "cancelled"}
                          onClick={() => setPayDialog(row)}
                        >
                          <Wallet className="size-4" aria-hidden="true" />
                          Record payment
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2"
                          onClick={() => setInvoiceDialog({ invoice: inv })}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 text-destructive"
                          onClick={() => void handleRemove(inv)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      row.balance > 0 && (
                        <p className="type-caption mt-4 text-muted-foreground">
                          Pay at the school office or by M-Pesa, then the office will confirm it
                          here.
                        </p>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {receipt && school && (() => {
        const st = (students.data ?? []).find((x) => x.id === receipt.invoice.student_id);
        const sc = school as unknown as { name: string; address?: string | null; phone?: string | null };
        return (
          <ReceiptVoucher
            payment={receipt.payment}
            invoice={receipt.invoice}
            allPayments={payments.data ?? []}
            school={sc}
            pupil={{
              name: nameById.get(receipt.invoice.student_id) ?? "Pupil",
              admission_no: st?.admission_no,
              class_label: [st?.grade_level, st?.class_name].filter(Boolean).join(" ") || null,
            }}
            onClose={() => setReceipt(null)}
          />
        );
      })()}

      {isAdmin && invoiceDialog && (
        <InvoiceDialog
          key={invoiceDialog.invoice?.id ?? "new"}
          invoice={invoiceDialog.invoice}
          students={(students.data ?? []).map((s) => ({ id: s.id, name: fullName(s) }))}
          saving={saveInvoice.isPending}
          onClose={() => setInvoiceDialog(null)}
          onSave={async (values) => {
            if (!school) return;
            try {
              await saveInvoice.mutateAsync({
                ...(invoiceDialog.invoice ? { id: invoiceDialog.invoice.id } : {}),
                values,
                schoolId: school.id,
              });
              toast.success(invoiceDialog.invoice ? "Fee updated" : "Fee added");
              setInvoiceDialog(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't save that fee.");
            }
          }}
        />
      )}

      {isAdmin && payDialog && (
        <PaymentDialog
          key={payDialog.invoice.id}
          summary={payDialog}
          pupil={nameById.get(payDialog.invoice.student_id) ?? "this pupil"}
          saving={recordPayment.isPending}
          onClose={() => setPayDialog(null)}
          onSave={async (values) => {
            if (!profile || !school) return;
            try {
              await recordPayment.mutateAsync({
                values,
                recordedBy: profile.id,
                schoolId: school.id,
              });
              toast.success("Payment recorded and the family has been told");
              setPayDialog(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't record that payment.");
            }
          }}
        />
      )}
    </AppShell>
  );
}

function InvoiceDialog({
  invoice,
  students,
  saving,
  onClose,
  onSave,
}: {
  invoice?: FeeInvoice | undefined;
  students: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: InvoiceInput) => Promise<void>;
}) {
  const [values, setValues] = useState<InvoiceInput>(
    invoice
      ? {
          student_id: invoice.student_id,
          term_label: invoice.term_label,
          amount_kes: invoice.amount_kes,
          due_date: invoice.due_date,
          notes: invoice.notes,
          status: invoice.status,
        }
      : emptyInvoice(),
  );

  const valid = values.student_id && values.term_label.trim() && values.amount_kes > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-floating silk max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit fee" : "Add a bus fee"}</DialogTitle>
          <DialogDescription>
            Set the termly transport fee for one pupil. Parents see it straight away.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fee-pupil">Pupil</Label>
            <Select
              value={values.student_id}
              onValueChange={(v) => setValues((p) => ({ ...p, student_id: v }))}
            >
              <SelectTrigger id="fee-pupil">
                <SelectValue placeholder="Choose a pupil" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fee-term">Term</Label>
            <Input
              id="fee-term"
              placeholder="Term 3 2026"
              value={values.term_label}
              onChange={(e) => setValues((p) => ({ ...p, term_label: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fee-amount">Amount (KES)</Label>
              <Input
                id="fee-amount"
                type="number"
                min={1}
                inputMode="numeric"
                value={values.amount_kes || ""}
                onChange={(e) =>
                  setValues((p) => ({ ...p, amount_kes: Number(e.target.value) || 0 }))
                }
              />
              <div className="flex flex-wrap gap-1.5" aria-label="Pickup distance zones">
                {[
                  { label: "Zone A · 0–3 km", kes: 3800 },
                  { label: "Zone B · 3–7 km", kes: 4800 },
                  { label: "Zone C · 7–12 km", kes: 5800 },
                  { label: "Zone D · 12 km+", kes: 6800 },
                ].map((z) => (
                  <Button
                    key={z.label}
                    type="button"
                    size="sm"
                    variant={values.amount_kes === z.kes ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      setValues((p) => ({
                        ...p,
                        amount_kes: z.kes,
                        notes: `${z.label} — fee set by distance from home to school.`,
                      }))
                    }
                  >
                    {z.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fee-due">Due date</Label>
              <Input
                id="fee-due"
                type="date"
                value={values.due_date}
                onChange={(e) => setValues((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fee-notes">Note for parents (optional)</Label>
            <Textarea
              id="fee-notes"
              rows={2}
              placeholder="Covers morning and evening trips for the term."
              value={values.notes ?? ""}
              onChange={(e) => setValues((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fee-status">Status</Label>
            <Select
              value={values.status}
              onValueChange={(v) =>
                setValues((p) => ({ ...p, status: v as InvoiceInput["status"] }))
              }
            >
              <SelectTrigger id="fee-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={() => void onSave(values)}>
            {saving ? "Saving…" : invoice ? "Save changes" : "Add fee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  summary,
  pupil,
  saving,
  onClose,
  onSave,
}: {
  summary: InvoiceSummary;
  pupil: string;
  saving: boolean;
  onClose: () => void;
  onSave: (values: {
    invoice_id: string;
    amount_kes: number;
    method: PaymentMethod;
    reference: string | null;
    paid_at: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(summary.balance);
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [reference, setReference] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-floating silk">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            {pupil} · {summary.invoice.term_label} · balance {formatKes(summary.balance)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pay-amount">Amount (KES)</Label>
            <Input
              id="pay-amount"
              type="number"
              min={1}
              inputMode="numeric"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pay-method">How it was paid</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="pay-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pay-ref">
              {method === "mpesa" ? "M-Pesa code" : "Reference"} (optional)
            </Label>
            <Input
              id="pay-ref"
              placeholder={method === "mpesa" ? "e.g. QGR4TY7HJ2" : "Receipt or slip number"}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={amount <= 0 || saving}
            onClick={() =>
              void onSave({
                invoice_id: summary.invoice.id,
                amount_kes: amount,
                method,
                reference: reference || null,
                paid_at: new Date().toISOString(),
              })
            }
          >
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
