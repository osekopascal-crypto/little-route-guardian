import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "error" | "info" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  error: "bg-destructive/12 text-destructive border-destructive/35",
  info: "bg-info/12 text-info border-info/30",
  primary: "bg-primary/15 text-primary border-primary/35",
};

const shapes: Record<Tone, string> = {
  neutral: "rounded-full",
  success: "rounded-full",
  warning: "rounded-[4px]",
  error: "rounded-[4px]",
  info: "rounded-full",
  primary: "rounded-full",
};

/**
 * Status is never communicated by colour alone: every pill carries a text
 * label, a distinct dot/shape and (optionally) an icon.
 */
export function StatusPill({
  tone = "neutral",
  children,
  icon,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "type-label inline-flex items-center gap-2 border px-2.5 py-1.5",
        tones[tone],
        shapes[tone],
        className,
      )}
    >
      {icon ?? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
