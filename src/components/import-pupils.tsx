import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { studentKeys } from "@/lib/students";

const HEADERS = ["first_name", "last_name", "admission_no", "grade_level", "class_name", "home_address", "pickup_notes", "guardian_name", "guardian_phone", "relationship"];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** Normalise Kenyan phone numbers to 2547XXXXXXXX so 07.., +254.. and 254.. match. */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let d = value.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = "254" + d.slice(1);
  else if (d.length === 9 && /^[17]/.test(d)) d = "254" + d;
  return d.length >= 9 ? d : null;
}

const RELATIONSHIPS = ["mother", "father", "guardian", "other"];

/** Strip leading characters spreadsheets treat as formulas (=, +, -, @, tab, CR). */
export function sanitizeCell(value: string): string {
  return value.trim().replace(/^[=+\-@\t\r\s]+/, "").trim();
}

function downloadTemplate() {
  const body = `${HEADERS.join(",")}\nZawadi,Mwangi,ADM-1001,Grade 4,4 East,Ndumberi near the stadium,Pick at Sam Mali shop,Grace Mwangi,0712345678,mother\n`;
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "pupils-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPupils({ schoolId }: { schoolId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function handle(file: File) {
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const col = (name: string) => head.indexOf(name);
      if (col("first_name") < 0 || col("last_name") < 0 || col("admission_no") < 0) {
        throw new Error("The sheet needs first_name, last_name and admission_no columns. Download the template.");
      }
      const get = (r: string[], n: string) =>
        col(n) >= 0 ? sanitizeCell(r[col(n)] ?? "") || null : null;
      const records = rows
        .map((r) => ({
          school_id: schoolId,
          first_name: get(r, "first_name") ?? "",
          last_name: get(r, "last_name") ?? "",
          admission_no: get(r, "admission_no") ?? "",
          grade_level: get(r, "grade_level"),
          class_name: get(r, "class_name"),
          home_address: get(r, "home_address"),
          pickup_notes: get(r, "pickup_notes"),
          guardian_name: get(r, "guardian_name"),
          guardian_phone: get(r, "guardian_phone"),
          guardian_relationship: (() => {
            const v = (get(r, "relationship") ?? "").toLowerCase();
            return RELATIONSHIPS.includes(v) ? v : v ? "other" : null;
          })(),
        }))
        .filter((r) => r.first_name && r.last_name && r.admission_no);
      if (!records.length) throw new Error("No complete pupil rows found in the file.");
      const { data: inserted, error } = await supabase
        .from("students")
        .insert(records)
        .select("id, guardian_phone, guardian_relationship");
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Some admission numbers are already on the register. Remove them and try again."
            : "We couldn't import this file. Check it matches the template.",
        );
      }
      // Link pupils to parent accounts that already exist with the same phone number.
      let linked = 0;
      const withPhone = (inserted ?? []).filter((r) => normalizePhone(r.guardian_phone));
      if (withPhone.length) {
        const { data: parents } = await supabase
          .from("profiles")
          .select("id, phone")
          .eq("school_id", schoolId)
          .eq("role", "parent");
        const byPhone = new Map(
          (parents ?? []).map((p) => [normalizePhone(p.phone), p.id] as const).filter(([k]) => k),
        );
        const links = withPhone
          .map((r) => ({
            school_id: schoolId,
            student_id: r.id,
            guardian_id: byPhone.get(normalizePhone(r.guardian_phone)),
            relationship: r.guardian_relationship ?? "guardian",
            is_primary: true,
          }))
          .filter((l): l is typeof l & { guardian_id: string } => Boolean(l.guardian_id));
        if (links.length) {
          const { error: linkError } = await supabase.from("student_guardians").insert(links);
          if (!linkError) linked = links.length;
        }
      }
      void qc.invalidateQueries({ queryKey: studentKeys.all });
      const waiting = withPhone.length - linked;
      toast.success(`${records.length} pupils added to the register`, {
        description: withPhone.length
          ? `${linked} linked to their parent's account${waiting ? ` · ${waiting} parent contacts saved, ready to link once their account is set up` : ""}`
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <Button variant="ghost" className="type-button min-h-11 gap-2" onClick={downloadTemplate}>
        <Download className="size-4" aria-hidden="true" />
        Template
      </Button>
      <Button
        variant="outline"
        className="type-button min-h-11 gap-2"
        disabled={busy || !schoolId}
        onClick={() => input.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
        Import sheet
      </Button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        aria-label="Pupil sheet"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && void handle(e.target.files[0])}
      />
    </>
  );
}
