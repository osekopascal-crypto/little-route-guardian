import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2, ShieldX } from "lucide-react";
import { useEffect } from "react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { type AppRole, roleHome, useAuth } from "@/lib/auth";

function CenteredPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="atmosphere grid min-h-screen place-items-center px-4">
      <div className="surface-2 animate-rise w-full max-w-md rounded-3xl p-8 text-center">
        {children}
      </div>
    </div>
  );
}

export function FullScreenLoader({ label = "Preparing your dashboard" }: { label?: string }) {
  return (
    <CenteredPanel>
      <Brand className="justify-center" size="lg" showWordmark={false} />
      <p className="type-body mt-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        <span role="status">{label}…</span>
      </p>
    </CenteredPanel>
  );
}

/**
 * UX-level role gate. The real security boundary is PostgreSQL row level
 * security — this only keeps people out of screens that aren't theirs.
 */
export function RoleGate({ allow, children }: { allow: AppRole; children: React.ReactNode }) {
  const { state, profile, errorMessage, reload, signOut } = useAuth();
  const navigate = useNavigate();

  const mismatch = state === "ready" && profile !== null && profile.role !== allow;

  useEffect(() => {
    if (mismatch && profile) {
      void navigate({ to: roleHome[profile.role], replace: true });
    }
  }, [mismatch, profile, navigate]);

  if (state === "loading" || state === "unauthenticated") return <FullScreenLoader />;

  if (state === "error") {
    return (
      <CenteredPanel>
        <AlertTriangle className="mx-auto size-8 text-warning" aria-hidden="true" />
        <h1 className="type-h2 mt-4">We couldn't load your account</h1>
        <p className="type-body-sm mt-2 text-muted-foreground">
          {errorMessage ?? "Please try again in a moment."}
        </p>
        <Button className="mt-6 w-full" onClick={reload}>
          Try again
        </Button>
      </CenteredPanel>
    );
  }

  if (state === "incomplete") {
    return (
      <CenteredPanel>
        <ShieldX className="mx-auto size-8 text-destructive" aria-hidden="true" />
        <h1 className="type-h2 mt-4">Your account isn't ready yet</h1>
        <p className="type-body-sm mt-2 text-muted-foreground">
          This account has no active role at a school, so we can't open a dashboard for it.
          Please ask your school administrator to finish setting it up.
        </p>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={async () => {
            await signOut();
            void navigate({ to: "/", replace: true });
          }}
        >
          Back to sign in
        </Button>
      </CenteredPanel>
    );
  }

  if (mismatch) {
    return (
      <CenteredPanel>
        <ShieldX className="mx-auto size-8 text-destructive" aria-hidden="true" />
        <h1 className="type-h2 mt-4">Access denied</h1>
        <p className="type-body-sm mt-2 text-muted-foreground">
          This area is for a different role. Taking you back to your own dashboard.
        </p>
        {profile && (
          <Button asChild className="mt-6 w-full">
            <Link to={roleHome[profile.role]}>Go to my dashboard</Link>
          </Button>
        )}
      </CenteredPanel>
    );
  }

  return <>{children}</>;
}
