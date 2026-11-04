import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { studentKeys } from "@/lib/students";

const HEADERS = ["first_name", "last_name", "admission_no", "grade_level", "class_name", "home_address", "pickup_notes"];

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

function downloadTemplate() {
  const body = `${HEADERS.join(",")}\nZawadi,Mwangi,ADM-1001,Grade 4,4 East,Ndumberi near the stadium,Pick at Sam Mali shop\n`;
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
      const get = (r: string[], n: string) => (col(n) >= 0 ? (r[col(n)] ?? "").trim() || null : null);
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
        }))
        .filter((r) => r.first_name && r.last_name && r.admission_no);
      if (!records.length) throw new Error("No complete pupil rows found in the file.");
      const { error } = await supabase.from("students").insert(records);
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Some admission numbers are already on the register. Remove them and try again."
            : "We couldn't import this file. Check it matches the template.",
        );
      }
      void qc.invalidateQueries({ queryKey: studentKeys.all });
      toast.success(`${records.length} pupils added to the register`);
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
