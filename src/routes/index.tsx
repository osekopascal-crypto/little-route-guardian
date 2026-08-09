import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Brand } from "@/components/brand";
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
    <div className="atmosphere grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-center gap-14 overflow-hidden border-r border-hairline p-12 lg:flex">
        <Brand size="lg" />
        <div className="max-w-lg">
          <p className="type-label text-primary">Multi-school transport platform</p>
          <h2 className="type-display mt-5 text-foreground">
            Every child accounted for, every journey.
          </h2>
          <p className="type-body mt-5 text-muted-foreground">
            One secure platform connecting school administrators, bus attendants and parents —
            built so each school's data stays strictly its own.
          </p>
        </div>
        <ul className="grid gap-3">
          {[
            "School-isolated data by design",
            "Role-aware access for admins, attendants and parents",
            "Calm, real-time reassurance for families",
          ].map((item) => (
            <li key={item} className="type-body-sm flex items-center gap-3 text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <div
          aria-hidden="true"
          className="route-motif pointer-events-none absolute -right-24 top-1/2 size-[28rem] -translate-y-1/2 rounded-full opacity-30 blur-[1px]"
        />
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="animate-rise w-full max-w-sm">
          <div className="lg:hidden">
            <Brand size="md" />
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="type-h1 text-foreground">Welcome back</h1>
            <p className="type-body-sm mt-2 text-muted-foreground">
              Sign in to continue to your school transport workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="surface-2 mt-6 space-y-5 rounded-3xl p-6">
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
