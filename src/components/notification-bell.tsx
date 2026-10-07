import { Link } from "@tanstack/react-router";
import { Bell, Receipt, TriangleAlert, BusFront, Check, Megaphone, Navigation } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  timeAgo,
  useMarkNotificationsRead,
  useNotifications,
  type NotificationKind,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

const iconByKind: Record<NotificationKind, typeof Bell> = {
  info: Bell,
  ride: BusFront,
  trip: Navigation,
  announcement: Megaphone,
  payment: Receipt,
  incident: TriangleAlert,
};

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const items = data ?? [];
  const unread = useMemo(() => items.filter((n) => !n.read_at), [items]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative min-h-9 shrink-0 px-2"
          aria-label={unread.length > 0 ? `Alerts, ${unread.length} new` : "Alerts"}
        >
          <Bell className="size-[18px]" aria-hidden="true" />
          {unread.length > 0 && (
            <span className="chip-gradient absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="glass-elevated silk w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <p className="type-label text-foreground">Alerts</p>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2"
              onClick={() => markRead.mutate(unread.map((n) => n.id))}
              disabled={markRead.isPending}
            >
              <Check className="size-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {items.length === 0 ? (
            <p className="type-caption px-4 py-6 text-center text-muted-foreground">
              Nothing yet. You'll hear from us the moment something happens on the bus.
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {items.map((n) => {
                const Icon = iconByKind[n.kind] ?? Bell;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      !n.read_at && "bg-primary/5",
                    )}
                  >
                    <span className="chip-gradient mt-0.5 grid size-8 shrink-0 place-items-center rounded-full">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="type-caption font-semibold text-foreground">{n.title}</p>
                      <p className="type-meta mt-0.5 text-muted-foreground">{n.body}</p>
                      <p className="type-meta mt-1 text-muted-foreground/70">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-hairline px-4 py-2.5">
          <Link to="/notices" className="type-caption font-semibold text-primary">
            Open notice board
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
