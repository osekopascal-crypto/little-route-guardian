import { Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PAYEE, tierFor } from "@/lib/billing";
import { formatKes } from "@/lib/fees";
import { useBuses } from "@/lib/fleet";
import { useStudents } from "@/lib/students";

export function SubscriptionCard() {
  const buses = useBuses();
  const students = useStudents();
  const busCount = (buses.data ?? []).length;
  const pupils = (students.data ?? []).filter((s) => s.status === "active").length;
  const tier = tierFor(busCount, pupils);

  return (
    <section className="glass-elevated mt-8 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center" aria-label="Platform subscription">
      <div>
        <p className="type-caption uppercase tracking-wider text-muted-foreground">Your plan · billed per term</p>
        <p className="type-h2 mt-1">
          {tier.name} · {formatKes(tier.priceKes)} / term
        </p>
        <p className="type-body-sm text-muted-foreground">
          {busCount} buses · {pupils} pupils. Annual upfront payment gets 10% off.
        </p>
      </div>
      <div className="glass-soft grid gap-1 p-4">
        <p className="type-caption flex items-center gap-1.5 text-muted-foreground">
          <Smartphone className="size-3.5" aria-hidden="true" /> Pay by {PAYEE.method}
        </p>
        <p className="type-h3 font-semibold tracking-wide">{PAYEE.number}</p>
        <p className="type-caption text-muted-foreground">Name: {PAYEE.name} · use school name as reference</p>
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 justify-start gap-2"
          onClick={() => void navigator.clipboard.writeText(PAYEE.number).then(() => toast.success("Number copied"))}
        >
          <Copy className="size-3.5" aria-hidden="true" /> Copy number
        </Button>
      </div>
    </section>
  );
}
