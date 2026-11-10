import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Boarding taps saved on this phone while there is no signal, synced when it returns. */
export type QueuedRiderUpdate = {
  id: string;
  patch: { status?: string; boarded_at?: string; dropped_at?: string };
  queuedAt: string;
};

const KEY = "attendant-offline-queue-v1";
const EVENT = "attendant-offline-queue-change";

export function readQueue(): QueuedRiderUpdate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as QueuedRiderUpdate[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedRiderUpdate[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

/** Later taps on the same pupil replace earlier ones, keeping the newest timestamps. */
export function mergeIntoQueue(
  queue: QueuedRiderUpdate[],
  item: QueuedRiderUpdate,
): QueuedRiderUpdate[] {
  const existing = queue.find((q) => q.id === item.id);
  const rest = queue.filter((q) => q.id !== item.id);
  return [...rest, { ...item, patch: { ...(existing?.patch ?? {}), ...item.patch } }];
}

export function enqueue(item: QueuedRiderUpdate) {
  writeQueue(mergeIntoQueue(readQueue(), item));
}

export function isNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /failed to fetch|network|load failed|fetch/i.test(msg);
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let synced = 0;
  try {
    for (const item of readQueue()) {
      const { error } = await supabase.from("trip_students").update(item.patch).eq("id", item.id);
      if (error) {
        if (isNetworkError(error)) break;
        // Rejected by the server (e.g. not your trip): drop it so it doesn't block the rest.
      }
      writeQueue(readQueue().filter((q) => q.id !== item.id || q.queuedAt !== item.queuedAt));
      if (!error) synced++;
    }
  } finally {
    flushing = false;
  }
  return synced;
}

/** Tracks online state and pending taps; auto-syncs when signal returns. */
export function useOfflineQueue(onSynced?: (n: number) => void) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => setPending(readQueue().length);
    const sync = async () => {
      const n = await flushQueue();
      refresh();
      if (n > 0) onSynced?.(n);
    };
    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    refresh();
    if (navigator.onLine) void sync();
    const timer = window.setInterval(() => navigator.onLine && readQueue().length && void sync(), 15_000);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(EVENT, refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { online, pending };
}
