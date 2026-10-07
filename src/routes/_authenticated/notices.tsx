import { createFileRoute } from "@tanstack/react-router";
import { Bell, Receipt, TriangleAlert, BusFront, Check, Megaphone, Navigation, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  audienceLabel,
  timeAgo,
  useAnnouncements,
  useDeleteAnnouncement,
  useDeleteNotification,
  useMarkNotificationsRead,
  useNotifications,
  useSaveAnnouncement,
  type Announcement,
  type AnnouncementInput,
  type NotificationKind,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({
    meta: [
      { title: "Notice board & alerts — School Transport" },
      {
        name: "description",
        content:
          "Every bus alert and school notice in one place: boarding updates, run changes and messages from the school office.",
      },
      { property: "og:title", content: "Notice board & alerts — School Transport" },
      {
        property: "og:description",
        content: "Bus alerts and school notices for parents and staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoticesPage,
});

const emptyDraft: AnnouncementInput = { title: "", body: "", audience: "all" };

const iconByKind: Record<NotificationKind, typeof Bell> = {
  info: Bell,
  ride: BusFront,
  trip: Navigation,
  announcement: Megaphone,
  payment: Receipt,
  incident: TriangleAlert,
};

function NoticesPage() {
  const { profile, school } = useAuth();
  const isAdmin = profile?.role === "admin";

  const notifications = useNotifications();
  const announcements = useAnnouncements();
  const markRead = useMarkNotificationsRead();
  const removeNotification = useDeleteNotification();
  const removeAnnouncement = useDeleteAnnouncement();
  const save = useSaveAnnouncement();

  const [editing, setEditing] = useState<{ notice?: Announcement } | null>(null);
  const [draft, setDraft] = useState<AnnouncementInput>(emptyDraft);

  const alerts = notifications.data ?? [];
  const unread = useMemo(() => alerts.filter((a) => !a.read_at), [alerts]);
  const notices = announcements.data ?? [];

  function openDialog(notice?: Announcement) {
    setDraft(
      notice
        ? { title: notice.title, body: notice.body, audience: notice.audience }
        : emptyDraft,
    );
    setEditing(notice ? { notice } : {});
  }

  async function handleSave() {
    if (!profile || !school) return;
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error("Give the notice a title and a message.");
      return;
    }
    try {
      await save.mutateAsync({
        ...(editing?.notice ? { id: editing.notice.id } : {}),
        schoolId: school.id,
        authorId: profile.id,
        input: draft,
      });
      toast.success(editing?.notice ? "Notice updated" : "Notice sent");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that notice.");
    }
  }

  return (
    <AppShell
      title="Notice board"
      greetingLine={
        isAdmin
          ? "Send a message to parents or attendants, and follow every alert the system raises."
          : "Bus updates and messages from the school office, newest first."
      }
      actions={
        isAdmin ? (
          <Button className="min-h-11 gap-2" onClick={() => openDialog()}>
            <Plus className="size-4" aria-hidden="true" />
            New notice
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="scene-3d animate-rise">
          <div className="glass-elevated silk lift-3d edge-lit p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="type-h3 text-foreground">Your alerts</h2>
                <p className="type-caption mt-1 text-muted-foreground">
                  {unread.length > 0 ? `${unread.length} new` : "All caught up"}
                </p>
              </div>
              {unread.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => markRead.mutate(unread.map((a) => a.id))}
                  disabled={markRead.isPending}
                >
                  <Check className="size-4" aria-hidden="true" />
                  Mark all read
                </Button>
              )}
            </div>

            <div aria-hidden="true" className="route-line mt-5 w-32 opacity-80" />

            {alerts.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  icon={<Bell className="size-5" aria-hidden="true" />}
                  title="No alerts yet"
                  description="You'll be told the moment a bus starts its run or a child boards."
                />
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {alerts.map((alert) => {
                  const Icon = iconByKind[alert.kind] ?? Bell;
                  return (
                    <li
                      key={alert.id}
                      className={cn(
                        "glass-soft flex gap-3 rounded-2xl p-3.5",
                        !alert.read_at && "ring-1 ring-primary/25",
                      )}
                    >
                      <span className="chip-gradient mt-0.5 grid size-9 shrink-0 place-items-center rounded-full">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="type-caption font-semibold text-foreground">{alert.title}</p>
                        <p className="type-meta mt-0.5 text-muted-foreground">{alert.body}</p>
                        <p className="type-meta mt-1 text-muted-foreground/70">
                          {timeAgo(alert.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 shrink-0 p-0"
                        aria-label="Dismiss alert"
                        onClick={() => removeNotification.mutate(alert.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="scene-3d animate-rise" style={{ animationDelay: "80ms" }}>
          <div className="glass-elevated silk lift-3d edge-lit p-5 sm:p-6">
            <h2 className="type-h3 text-foreground">School notices</h2>
            <p className="type-caption mt-1 text-muted-foreground">
              Messages from {school?.name ?? "the school office"}.
            </p>
            <div aria-hidden="true" className="route-line mt-5 w-32 opacity-80" />

            {notices.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  icon={<Megaphone className="size-5" aria-hidden="true" />}
                  title="No notices posted"
                  description={
                    isAdmin
                      ? "Post your first notice to reach parents and attendants instantly."
                      : "The school hasn't posted anything yet."
                  }
                />
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {notices.map((notice) => (
                  <li key={notice.id} className="glass-soft rounded-2xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="type-caption font-semibold text-foreground">{notice.title}</p>
                        <p className="type-meta mt-0.5 text-muted-foreground/70">
                          {timeAgo(notice.created_at)}
                        </p>
                      </div>
                      <StatusPill tone="neutral">{audienceLabel[notice.audience]}</StatusPill>
                    </div>
                    <p className="type-meta mt-2 whitespace-pre-line text-muted-foreground">
                      {notice.body}
                    </p>
                    {isAdmin && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openDialog(notice)}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={async () => {
                            try {
                              await removeAnnouncement.mutateAsync(notice.id);
                              toast.success("Notice removed");
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Couldn't remove that notice.",
                              );
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="glass-elevated silk">
          <DialogHeader>
            <DialogTitle>{editing?.notice ? "Edit notice" : "New notice"}</DialogTitle>
            <DialogDescription>
              Everyone in the chosen audience gets this as an alert straight away.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="notice-title">Title</Label>
              <Input
                id="notice-title"
                value={draft.title}
                placeholder="Morning buses will run 15 minutes late"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notice-body">Message</Label>
              <Textarea
                id="notice-body"
                rows={5}
                value={draft.body}
                placeholder="Heavy rain along the Kiambu corridor. Please wait with your child at the stop."
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notice-audience">Send to</Label>
              <Select
                value={draft.audience}
                onValueChange={(value) =>
                  setDraft({ ...draft, audience: value as AnnouncementInput["audience"] })
                }
              >
                <SelectTrigger id="notice-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="attendant">Bus attendants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? "Sending…" : editing?.notice ? "Save changes" : "Send notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
