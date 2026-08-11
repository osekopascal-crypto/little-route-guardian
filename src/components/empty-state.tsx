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
        "glass edge-lit relative flex flex-col items-center overflow-hidden px-6 py-14 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="chip-gradient float-y grid size-16 place-items-center rounded-[1.35rem]"
      >
        {icon}
      </div>
      <h3 className="type-h3 mt-6 text-foreground">{title}</h3>
      <p className="type-body-sm mt-2.5 max-w-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
      <div aria-hidden="true" className="route-line mt-9 w-2/3 opacity-50" />
    </div>
  );
}
