import { cn } from "@/lib/utils";

/**
 * Environment — the atmospheric 3D-inspired light field the whole product
 * floats above: warm amber light pools, a perspective grid, blurred
 * architectural planes and abstract route curves.
 * Purely decorative; never interactive.
 */
export function Environment({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      {/* Ambient light */}
      <div className="orb left-[-14rem] top-[-10rem] size-[38rem] bg-primary/45" />
      <div
        className="orb right-[-12rem] top-[4rem] size-[30rem] bg-gold/35"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="orb bottom-[-14rem] left-[24%] size-[34rem] bg-primary/25"
        style={{ animationDelay: "-12s" }}
      />

      {/* Perspective grid */}
      <div className="grid-perspective absolute inset-0" />

      {/* Blurred architectural planes — depth without noise */}
      <div className="absolute inset-0">
        <div className="absolute -left-24 top-24 h-[26rem] w-[22rem] -rotate-12 rounded-[4rem] bg-graphite/[0.045] blur-2xl" />
        <div className="absolute -right-16 bottom-16 h-[30rem] w-[26rem] rotate-6 rounded-[5rem] bg-graphite/[0.05] blur-3xl" />
      </div>

      {/* Abstract route curves */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="env-route-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.8 0.155 82)" stopOpacity="0" />
            <stop offset="45%" stopColor="oklch(0.8 0.155 82)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="oklch(0.31 0.008 65)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="env-route-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.31 0.008 65)" stopOpacity="0.16" />
            <stop offset="60%" stopColor="oklch(0.72 0.14 72)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="oklch(0.72 0.14 72)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M-80 640 C 220 640 260 300 560 300 S 900 520 1280 420"
          stroke="url(#env-route-a)"
          strokeWidth="2.5"
          className="route-draw"
          style={{ ["--route-length" as string]: "1800" }}
        />
        <path
          d="M-60 260 C 260 180 420 460 720 500 S 1060 700 1260 660"
          stroke="url(#env-route-b)"
          strokeWidth="1.5"
          strokeDasharray="10 14"
          opacity="0.7"
        />
        <circle cx="560" cy="300" r="4.5" fill="oklch(0.8 0.155 82)" opacity="0.65" />
        <circle cx="720" cy="500" r="3.5" fill="oklch(0.72 0.14 72)" opacity="0.5" />
      </svg>

      {/* Soft vignette to settle the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_40%,oklch(0.24_0.02_70_/_0.07)_100%)]" />
    </div>
  );
}
