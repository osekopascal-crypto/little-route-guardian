import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Brand } from "@/components/brand";
import { Environment } from "@/components/environment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — School Transport" },
      {
        name: "description",
        content:
          "Secure sign in for school transport: administrators, bus attendants and parents.",
      },
      { property: "og:title", content: "Sign In — School Transport" },
      {
        property: "og:description",
        content: "Secure sign in for school administrators, bus attendants and parents.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { state, profile, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session restoration: an already-signed-in visitor goes straight to their area.
  useEffect(() => {
    if (state === "ready" && profile) {
      void navigate({ to: roleHome[profile.role], replace: true });
    }
  }, [state, profile, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  const busy = submitting || state === "loading";

  return (
    <div className="atmosphere relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <Environment />

      {/* Brand panel */}
      <section className="relative hidden flex-col justify-center gap-14 overflow-hidden p-12 lg:flex xl:p-16">
        <Brand size="lg" />
        <div className="max-w-lg">
          <p className="type-label text-primary">Premium school mobility platform</p>
          <h2 className="type-display mt-5 text-chrome">
            Every child accounted for, every journey.
          </h2>
          <p className="type-body mt-6 text-muted-foreground">
            One calm, secure operations layer connecting school administrators, bus attendants
            and parents — built so each school's data stays strictly its own.
          </p>
          <div aria-hidden="true" className="route-line mt-8 w-56" />
        </div>
        <ul className="grid gap-2.5">
          {[
            "School-isolated data by design",
            "Role-aware access for admins, attendants and parents",
            "Calm, real-time reassurance for families",
          ].map((item) => (
            <li
              key={item}
              className="glass-soft type-body-sm flex items-center gap-3 px-4 py-3 text-foreground"
            >
              <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="animate-rise w-full max-w-sm">
          <div className="lg:hidden">
            <Brand size="md" />
          </div>

          <div className="mt-9 lg:mt-0">
            <h1 className="type-h1 text-chrome">Welcome back</h1>
            <p className="type-body-sm mt-2.5 text-muted-foreground">
              Sign in to continue to your school transport workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass edge-lit mt-7 space-y-5 p-6 sm:p-7">

            <div className="space-y-2">
              <Label htmlFor="email" className="type-label text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.ac.ke"
                  className="min-h-12 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="type-label text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-12 pl-10"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="type-body-sm flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/12 px-3 py-2.5 text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="type-button min-h-12 w-full gap-2">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>

            <p className="type-caption text-center text-muted-foreground">
              Accounts are created by your school administrator.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
