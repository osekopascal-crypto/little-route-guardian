import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Gentle count-up for numeric KPI values; non-numeric values pass straight through. */
function useCountUp(value: string) {
  const target = Number(value);
  const numeric = value.trim() !== "" && Number.isFinite(target);
  const [shown, setShown] = useState(numeric ? 0 : null);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!numeric) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [numeric, target]);

  return numeric && shown !== null ? String(shown) : value;
}

/**
 * KPI card with three visual weights so metrics never read as a row of
 * identical rectangles.
 *  - "primary": gold glass, largest presence (the headline metric)
 *  - "default": elevated glass panel
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
    emphasis === "primary" ? "glass-gold" : emphasis === "quiet" ? "glass-soft" : "glass-elevated";
  const display = useCountUp(value);

  return (
    <div
      className={cn("scene-3d animate-rise", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          surface,
          "silk crest lift-3d edge-lit relative flex h-full flex-col overflow-hidden p-5 sm:p-6",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="type-label min-w-0 text-muted-foreground">{label}</p>
          {icon && (
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                emphasis === "primary" ? "chip-obsidian text-primary" : "glass-soft text-accent",
              )}
            >
              {icon}
            </span>
          )}
        </div>

        <p className={cn("type-kpi mt-6", emphasis === "primary" ? "text-holo" : "text-chrome")}>
          {display}
        </p>

        <div className="mt-3 flex items-center gap-2.5">
          {live && <span aria-hidden="true" className="stop-node size-2 shrink-0" />}
          <p className="type-meta text-muted-foreground">{hint}</p>
        </div>

        <div aria-hidden="true" className="mt-auto pt-5">
          <div className="route-line w-full opacity-70" />
        </div>

      </div>
    </div>
  );
}
