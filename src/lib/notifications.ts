import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type NotificationKind = "info" | "ride" | "trip" | "announcement";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  student_id: string | null;
  trip_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  school_id: string;
  author_id: string;
  title: string;
  body: string;
  audience: "all" | "parent" | "attendant";
  created_at: string;
};

export type AnnouncementInput = {
  title: string;
  body: string;
  audience: Announcement["audience"];
};

export const notificationKeys = {
  list: ["notifications"] as const,
  announcements: ["announcements"] as const,
};

const NOTIFICATION_COLUMNS =
  "id, kind, title, body, student_id, trip_id, read_at, created_at";

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("row-level security")) {
    return "You don't have permission to do that.";
  }
  return message;
}

/** Alerts addressed to the signed-in person, newest first. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    refetchInterval: 20_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}

/** School notices visible to the signed-in person. */
export function useAnnouncements() {
  return useQuery({
    queryKey: notificationKeys.announcements,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, school_id, author_id, title, body, audience, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    refetchInterval: 60_000,
  });
}

export function useSaveAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      schoolId: string;
      authorId: string;
      input: AnnouncementInput;
    }) => {
      const row = {
        title: payload.input.title.trim(),
        body: payload.input.body.trim(),
        audience: payload.input.audience,
        school_id: payload.schoolId,
        author_id: payload.authorId,
      };
      const query = payload.id
        ? supabase.from("announcements").update(row).eq("id", payload.id)
        : supabase.from("announcements").insert(row);
      const { error } = await query;
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.announcements });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.announcements });
    },
  });
}

export const audienceLabel: Record<Announcement["audience"], string> = {
  all: "Everyone",
  parent: "Parents",
  attendant: "Bus attendants",
};

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}
