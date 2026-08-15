import { useId } from "react";

import { cn } from "@/lib/utils";

/** Refined obsidian shield mark with an amber bus glyph. */
function Mark({ className }: { className?: string }) {
  const gid = `brand-amber-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.9 0.14 92)" />
          <stop offset="55%" stopColor="oklch(0.81 0.16 82)" />
          <stop offset="100%" stopColor="oklch(0.71 0.14 62)" />
        </linearGradient>
      </defs>
      <path
        d="M20 4.5 33 8.6v11.2c0 7.2-5.1 13.4-13 16.2-7.9-2.8-13-9-13-16.2V8.6L20 4.5Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.6"
        strokeOpacity="0.85"
      />
      <rect x="12.5" y="13" width="15" height="11" rx="3" fill={`url(#${gid})`} />
      <rect x="14.6" y="15.4" width="4.6" height="3.6" rx="1.1" fill="oklch(0.22 0.02 68)" />
      <rect x="20.8" y="15.4" width="4.6" height="3.6" rx="1.1" fill="oklch(0.22 0.02 68)" />
      <circle cx="15.6" cy="25.4" r="1.7" fill={`url(#${gid})`} />
      <circle cx="24.4" cy="25.4" r="1.7" fill={`url(#${gid})`} />
    </svg>
  );
}

export function Brand({
  className,
  size = "md",
  showWordmark = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const box = size === "lg" ? "size-13" : size === "sm" ? "size-9" : "size-11";
  const icon = size === "lg" ? "size-8" : size === "sm" ? "size-6" : "size-7";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "chip-obsidian crest relative grid shrink-0 place-items-center rounded-2xl",
          box,
        )}
      >
        <Mark className={icon} />
      </div>
      {showWordmark && (
        <div className="min-w-0 leading-none">
          <p
            className={cn(
              "font-display truncate font-semibold tracking-tightest text-foreground",
              size === "lg" ? "text-[1.35rem]" : "text-[1.02rem]",
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
