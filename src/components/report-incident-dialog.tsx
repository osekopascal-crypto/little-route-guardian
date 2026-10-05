import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  kindLabel,
  severityLabel,
  useReportIncident,
  type IncidentKind,
  type IncidentSeverity,
} from "@/lib/incidents";

const NONE = "none";

export function ReportIncidentDialog({
  open,
  onOpenChange,
  tripId,
  busId,
  pupils,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  busId: string | null;
  pupils: { id: string; name: string }[];
}) {
  const { profile, school } = useAuth();
  const report = useReportIncident();
  const [kind, setKind] = useState<IncidentKind>("delay");
  const [severity, setSeverity] = useState<IncidentSeverity>("low");
  const [pupil, setPupil] = useState<string>(NONE);
  const [description, setDescription] = useState("");

  async function submit() {
    if (!profile || !school) return;
    try {
      await report.mutateAsync({
        schoolId: school.id,
        reporterId: profile.id,
        input: {
          kind,
          severity,
          description,
          student_id: pupil === NONE ? null : pupil,
          trip_id: tripId,
          bus_id: busId,
        },
      });
      toast.success("Reported — the school office has been told");
      setDescription("");
      setPupil(NONE);
      setSeverity("low");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send that report.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-floating silk max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
          <DialogDescription>
            The school office is alerted straight away. If you name a pupil, their family is told
            too.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="inc-kind">What happened</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as IncidentKind)}>
                <SelectTrigger id="inc-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(kindLabel) as IncidentKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {kindLabel[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inc-sev">How serious</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
                <SelectTrigger id="inc-sev">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(severityLabel) as IncidentSeverity[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {severityLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="inc-pupil">Pupil involved (optional)</Label>
            <Select value={pupil} onValueChange={setPupil}>
              <SelectTrigger id="inc-pupil">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No specific pupil</SelectItem>
                {pupils.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="inc-desc">Short description</Label>
            <Textarea
              id="inc-desc"
              rows={3}
              placeholder="Heavy traffic at Kiambu Stage — about 15 min late."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={description.trim().length < 3 || report.isPending}
            onClick={() => void submit()}
          >
            {report.isPending ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
