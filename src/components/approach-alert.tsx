import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

const THRESHOLD_MIN = 10;

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.5);
    });
  } catch {
    /* sound not available */
  }
}

/** Alerts a parent once per run when the bus is about 10 minutes from their child's stop. */
export function ApproachAlert({
  tripId,
  studentId,
  childName,
  stopName,
  eta,
  waiting,
}: {
  tripId: string;
  studentId: string;
  childName: string;
  stopName: string;
  eta: number | null;
  waiting: boolean;
}) {
  const [shown, setShown] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!waiting || eta === null || eta > THRESHOLD_MIN) return;
    const key = `approach:${tripId}:${studentId}:${new Date().toDateString()}`;
    setShown(true);
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    chime();
    navigator.vibrate?.([200, 100, 200]);
    const body = `About ${eta} min from ${stopName}. Time to get ${childName} ready.`;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("The bus is almost here", { body });
    }
  }, [eta, waiting, tripId, studentId, stopName, childName]);

  return (
    <>
      {shown && waiting && (
        <div role="alert" className="glass-elevated crest animate-rise flex items-center gap-3 border-l-4 border-primary p-4">
          <BellRing className="size-6 shrink-0 animate-pulse text-primary" aria-hidden="true" />
          <div>
            <p className="type-section text-foreground">The bus is almost here</p>
            <p className="type-body-sm text-muted-foreground">
              About {eta ?? THRESHOLD_MIN} min from {stopName}. Time to get {childName} ready.
            </p>
          </div>
        </div>
      )}
      {perm === "default" && (
        <button
          type="button"
          onClick={() => void Notification.requestPermission().then(setPerm)}
          className="glass-soft type-body-sm flex w-full items-center gap-2 px-4 py-3 text-left text-foreground"
        >
          <BellRing className="size-4 text-primary" aria-hidden="true" />
          Turn on phone alerts so we can tell you when the bus is 10 minutes away
        </button>
      )}
    </>
  );
}
