import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Bump when the notice text changes so every guardian re-confirms. */
export const CONSENT_VERSION = "2026-11-v1";

const points = [
  {
    title: "What we collect",
    body: "Your child's name, class and pickup stop; when they board and leave the bus; and the bus location while a trip is running.",
  },
  {
    title: "Why we collect it",
    body: "Only to keep your child safe on school transport and to let you see where the bus is. We never sell it or use it for advertising.",
  },
  {
    title: "Who can see it",
    body: "You, other guardians linked to your child, and authorised staff at your child's school. Other parents can never see your child.",
  },
  {
    title: "How long we keep it",
    body: "Bus location history is kept only as long as the school needs it for safety records, then removed.",
  },
  {
    title: "Your rights",
    body: "You can ask the school to show, correct or delete your child's information, or withdraw this consent, at any time.",
  },
];

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const key = ["guardian-consent", profile?.id, CONSENT_VERSION];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: key,
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_consents")
        .select("id")
        .eq("guardian_id", profile!.id)
        .eq("consent_version", CONSENT_VERSION)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("guardian_consents").insert({
        guardian_id: profile!.id,
        school_id: profile!.school_id,
        consent_version: CONSENT_VERSION,
        user_agent: navigator.userAgent.slice(0, 300),
      });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => qc.setQueryData(key, true),
    onError: () => toast.error("We couldn't save your consent. Please try again."),
  });

  if (data) return <>{children}</>;

  return (
    <div className="atmosphere grid min-h-screen place-items-center px-4 py-10">
      <div className="surface-2 animate-rise w-full max-w-lg rounded-3xl p-7 sm:p-8">
        <Brand size="lg" showWordmark={false} />
        {isLoading ? (
          <p className="type-body mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span role="status">Checking your account…</span>
          </p>
        ) : isError ? (
          <>
            <p className="type-body mt-6 text-muted-foreground">
              We couldn't check your privacy settings.
            </p>
            <Button className="mt-4 w-full" onClick={() => refetch()}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <h1 className="type-h2 mt-5 flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
              Your child's privacy
            </h1>
            <p className="type-body-sm mt-2 text-muted-foreground">
              Before you follow the bus, please read how your child's information is handled,
              in line with Kenya's Data Protection Act, 2019.
            </p>
            <ul className="mt-5 space-y-3">
              {points.map((p) => (
                <li key={p.title} className="glass-soft rounded-2xl p-4">
                  <p className="type-body-sm font-semibold">{p.title}</p>
                  <p className="type-body-sm mt-1 text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ul>
            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
                aria-label="I agree"
              />
              <span className="type-body-sm">
                I am this child's parent or guardian and I agree to my child's information being
                used as described above.
              </span>
            </label>
            <Button
              className="mt-6 w-full"
              disabled={!agreed || accept.isPending}
              onClick={() => accept.mutate()}
            >
              {accept.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              I agree — continue
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
