import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-1 flex flex-col items-center rounded-2xl px-6 py-10 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="route-motif grid size-16 place-items-center rounded-2xl border border-hairline bg-surface-2 text-primary"
      >
        {icon}
      </div>
      <h3 className="type-h3 mt-5 text-foreground">{title}</h3>
      <p className="type-body-sm mt-2 max-w-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
