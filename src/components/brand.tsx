import { Bus } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({
  className,
  size = "md",
  showWordmark = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const box = size === "lg" ? "size-12" : size === "sm" ? "size-9" : "size-11";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className={cn("relative grid place-items-center rounded-2xl chip-obsidian", box)}
      >
        <Bus className={cn(icon, "text-primary")} strokeWidth={2.25} />
        <span className="stop-node absolute -bottom-0.5 -right-0.5 size-2.5 border border-surface-1" />
      </div>
      {showWordmark && (
        <div className="leading-none">
          <p
            className={cn(
              "font-display tracking-tightest text-foreground",
              size === "lg" ? "text-xl font-bold" : "text-base font-bold",
            )}
          >
            School Transport
          </p>
          <p className="type-label mt-1.5 text-muted-foreground">Safe journeys, every day</p>
        </div>
      )}
    </div>
  );
}
