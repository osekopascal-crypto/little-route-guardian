import { cn } from "@/lib/utils";

/** Elegant contextual loading state — never a spinner. */
export function SkeletonBlock({
  lines = 3,
  label,
  className,
}: {
  lines?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass-soft p-6", className)} role="status" aria-live="polite">
      {label && (
        <p className="type-label mb-5 flex items-center gap-2.5 text-muted-foreground">
          <span aria-hidden="true" className="stop-node size-2" />
          {label}
        </p>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="skeleton-line h-3.5"
            style={{ width: `${92 - i * 14}%` }}
          />
        ))}
      </div>
    </div>
  );
}
