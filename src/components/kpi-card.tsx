import { cn } from "@/lib/utils";

/**
 * KPI card with three visual weights so metrics never read as a row of
 * identical rectangles.
 *  - "primary": gold glass, largest presence (the headline metric)
 *  - "default": clear glass panel
 *  - "quiet": soft, secondary glass
 */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  className,
  delay = 0,
  emphasis = "default",
  live = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
  className?: string;
  delay?: number;
  emphasis?: "primary" | "default" | "quiet";
  live?: boolean;
}) {
  const surface =
    emphasis === "primary" ? "glass-gold" : emphasis === "quiet" ? "glass-soft" : "glass";

  return (
    <div className={cn("scene-3d animate-rise", className)} style={{ animationDelay: `${delay}ms` }}>
      <div className={cn(surface, "lift-3d edge-lit relative h-full overflow-hidden p-5 sm:p-6")}>
        <div className="flex items-start justify-between gap-3">
          <p className="type-label text-muted-foreground">{label}</p>
          {icon && (
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                emphasis === "primary" ? "chip-obsidian text-primary" : "glass-soft text-accent",
              )}
            >
              {icon}
            </span>
          )}
        </div>

        <p
          className={cn(
            "type-kpi mt-5",
            emphasis === "primary" ? "text-holo" : "text-chrome",
          )}
        >
          {value}
        </p>

        <div className="mt-4 flex items-center gap-2.5">
          {live && (
            <span aria-hidden="true" className="stop-node size-2 shrink-0" />
          )}
          <p className="type-meta text-muted-foreground">{hint}</p>
        </div>

        <div aria-hidden="true" className="route-line mt-4 w-full opacity-70" />
      </div>
    </div>
  );
}
