import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  className,
  delay = 0,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("surface-2 interactive animate-rise rounded-2xl p-5", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="type-label text-muted-foreground">{label}</p>
        {icon && (
          <span aria-hidden="true" className="text-muted-foreground/70">
            {icon}
          </span>
        )}
      </div>
      <p className="type-kpi mt-4 text-foreground">{value}</p>
      <p className="type-caption mt-2 text-muted-foreground">{hint}</p>
    </div>
  );
}
