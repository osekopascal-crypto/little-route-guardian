import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "mpesa" | "cash" | "bank" | "other";

export type FeeInvoice = {
  id: string;
  school_id: string;
  student_id: string;
  term_label: string;
  amount_kes: number;
  due_date: string;
  notes: string | null;
  status: "open" | "cancelled";
  created_at: string;
};

export type FeePayment = {
  id: string;
  invoice_id: string;
  amount_kes: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
};

export type InvoiceInput = {
  student_id: string;
  term_label: string;
  amount_kes: number;
  due_date: string;
  notes: string | null;
  status: "open" | "cancelled";
};

export type PaymentInput = {
  invoice_id: string;
  amount_kes: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
};

export const feeKeys = {
  invoices: ["fee-invoices"] as const,
  payments: ["fee-payments"] as const,
};

const INVOICE_COLUMNS =
  "id, school_id, student_id, term_label, amount_kes, due_date, notes, status, created_at";

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("row-level security")) {
    return "You don't have permission to do that.";
  }
  if (message.includes("amount_kes")) {
    return "Enter an amount greater than zero.";
  }
  return "We couldn't save that. Please try again.";
}

export function useInvoices() {
  return useQuery({
    queryKey: feeKeys.invoices,
    queryFn: async (): Promise<FeeInvoice[]> => {
      const { data, error } = await supabase
        .from("fee_invoices")
        .select(INVOICE_COLUMNS)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as FeeInvoice[]).map((row) => ({
        ...row,
        amount_kes: Number(row.amount_kes),
      }));
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: feeKeys.payments,
    queryFn: async (): Promise<FeePayment[]> => {
      const { data, error } = await supabase
        .from("fee_payments")
        .select("id, invoice_id, amount_kes, method, reference, paid_at")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as FeePayment[]).map((row) => ({
        ...row,
        amount_kes: Number(row.amount_kes),
      }));
    },
  });
}

export function useSaveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      schoolId,
    }: {
      id?: string;
      values: InvoiceInput;
      schoolId: string;
    }) => {
      const row = {
        student_id: values.student_id,
        term_label: values.term_label.trim(),
        amount_kes: values.amount_kes,
        due_date: values.due_date,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        status: values.status,
      };
      const query = id
        ? supabase.from("fee_invoices").update(row).eq("id", id)
        : supabase.from("fee_invoices").insert({ ...row, school_id: schoolId });
      const { error } = await query;
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: feeKeys.invoices });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_invoices").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: feeKeys.invoices });
      void qc.invalidateQueries({ queryKey: feeKeys.payments });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      values,
      recordedBy,
      schoolId,
    }: {
      values: PaymentInput;
      recordedBy: string;
      schoolId: string;
    }) => {
      const { error } = await supabase.from("fee_payments").insert({
        invoice_id: values.invoice_id,
        amount_kes: values.amount_kes,
        method: values.method,
        reference: values.reference?.trim() ? values.reference.trim() : null,
        paid_at: values.paid_at,
        recorded_by: recordedBy,
        school_id: schoolId,
      });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: feeKeys.payments });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_payments").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: feeKeys.payments });
    },
  });
}

export const methodLabel: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  cash: "Cash",
  bank: "Bank transfer",
  other: "Other",
};

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export type InvoiceSummary = {
  invoice: FeeInvoice;
  paid: number;
  balance: number;
  state: "paid" | "part" | "due" | "overdue" | "cancelled";
};

export function summarise(invoice: FeeInvoice, payments: FeePayment[]): InvoiceSummary {
  const paid = payments
    .filter((p) => p.invoice_id === invoice.id)
    .reduce((sum, p) => sum + p.amount_kes, 0);
  const balance = Math.max(invoice.amount_kes - paid, 0);
  const overdue = new Date(`${invoice.due_date}T23:59:59`).getTime() < Date.now();

  let state: InvoiceSummary["state"];
  if (invoice.status === "cancelled") state = "cancelled";
  else if (balance === 0) state = "paid";
  else if (paid > 0) state = "part";
  else if (overdue) state = "overdue";
  else state = "due";

  return { invoice, paid, balance, state };
}

export const stateLabel: Record<InvoiceSummary["state"], string> = {
  paid: "Fully paid",
  part: "Part paid",
  due: "Due",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export function formatDueDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
