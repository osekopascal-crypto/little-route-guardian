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
  const box = size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "surface-primary grid place-items-center rounded-xl",
          box,
        )}
      >
        <Bus className={icon} strokeWidth={2.25} />
      </div>
      {showWordmark && (
        <div className="leading-none">
          <p
            className={cn(
              "font-extrabold tracking-tightest",
              size === "lg" ? "text-xl" : "text-base",
            )}
          >
            School Transport
          </p>
          <p className="type-label mt-1 text-muted-foreground">Safe journeys, every day</p>
        </div>
      )}
    </div>
  );
}
