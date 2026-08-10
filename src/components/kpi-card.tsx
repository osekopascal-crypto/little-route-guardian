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
    <div className={cn("scene-3d animate-rise", className)} style={{ animationDelay: `${delay}ms` }}>
      <div className="glass lift-3d edge-lit sheen h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="type-label text-muted-foreground">{label}</p>
          {icon && (
            <span
              aria-hidden="true"
              className="glass-soft grid size-8 place-items-center rounded-xl text-accent"
            >
              {icon}
            </span>
          )}
        </div>
        <p className="type-kpi text-holo mt-4">{value}</p>
        <p className="type-caption mt-2 text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
