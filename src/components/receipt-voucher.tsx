import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKes, methodLabel, type FeeInvoice, type FeePayment } from "@/lib/fees";

type SchoolInfo = { name: string; code?: string; address?: string | null; phone?: string | null };
type PupilInfo = { name: string; admission_no?: string | undefined; class_label?: string | null | undefined };

export function receiptNumber(p: FeePayment) {
  const year = new Date(p.paid_at).getFullYear();
  return `RCPT-${year}-${p.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function ReceiptVoucher({
  payment,
  invoice,
  allPayments,
  school,
  pupil,
  onClose,
}: {
  payment: FeePayment;
  invoice: FeeInvoice;
  allPayments: FeePayment[];
  school: SchoolInfo;
  pupil: PupilInfo;
  onClose: () => void;
}) {
  const paidToDate = allPayments
    .filter((p) => p.invoice_id === invoice.id && p.paid_at <= payment.paid_at)
    .reduce((s, p) => s + p.amount_kes, 0);
  const balance = Math.max(0, invoice.amount_kes - paidToDate);
  const date = new Date(payment.paid_at).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="flex justify-between gap-4 border-b border-dashed border-hairline py-2">
      <span className="type-caption text-muted-foreground">{label}</span>
      <span className={`type-body text-right text-foreground ${strong ? "font-bold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="print-hide">
          <DialogTitle>Payment receipt</DialogTitle>
        </DialogHeader>

        <article className="print-area rounded-xl border-2 border-foreground bg-card p-6 text-foreground">
          <header className="flex items-start justify-between gap-3 border-b-2 border-foreground pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-foreground font-display text-lg font-bold">
                {school.name.slice(0, 1)}
              </div>
              <div>
                <p className="type-h3 leading-tight">{school.name}</p>
                {school.address && <p className="type-caption text-muted-foreground">{school.address}</p>}
                {school.phone && <p className="type-caption text-muted-foreground">Tel: {school.phone}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="type-label">Official receipt</p>
              <p className="type-caption font-mono font-semibold">{receiptNumber(payment)}</p>
              <p className="type-caption text-muted-foreground">{date}</p>
            </div>
          </header>

          <p className="type-label mt-4 text-center">Transport fee voucher</p>

          <div className="mt-3">
            <Row label="Pupil" value={pupil.name} />
            {pupil.admission_no && <Row label="Admission no." value={pupil.admission_no} />}
            {pupil.class_label && <Row label="Class" value={pupil.class_label} />}
            <Row label="Term" value={invoice.term_label} />
            <Row label="Term transport fee" value={formatKes(invoice.amount_kes)} />
            <Row label="Amount received" value={formatKes(payment.amount_kes)} strong />
            <Row label="Paid by" value={methodLabel[payment.method]} />
            {payment.reference && <Row label="Transaction ref." value={payment.reference} />}
            <Row label="Total paid to date" value={formatKes(paidToDate)} />
            <Row label="Balance remaining" value={balance === 0 ? "Fully paid" : formatKes(balance)} strong />
          </div>

          <footer className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <div className="h-10 border-b border-foreground" />
              <p className="type-caption mt-1 text-muted-foreground">Bursar / Accounts signature</p>
            </div>
            <div className="grid h-20 place-items-center rounded-md border-2 border-dashed border-muted-foreground">
              <span className="type-caption text-muted-foreground">School stamp</span>
            </div>
          </footer>
          <p className="type-caption mt-4 text-center text-muted-foreground">
            Thank you. Please keep this receipt for your records.
          </p>
        </article>

        <div className="print-hide flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Print or save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
