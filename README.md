# School Transport SaaS — Phase 1 (Foundation)

A multi-tenant school transport platform. **Phase 1 delivers the secure
foundation only**: backend, authentication, roles, school tenancy, protected
routing, row level security, the design system and premium placeholder
dashboards. Transport functionality (students, buses, routes, trips, boarding)
belongs to later phases and is intentionally not built.

## Architecture

```
PLATFORM
└── SCHOOL (tenant)
    ├── admin       → /admin
    ├── attendant   → /attendant
    └── parent      → /parent
```

Every school-owned record from Phase 2 onward carries `school_id`.
A user belongs to exactly one school.

### Stack

React 19 · TypeScript · TanStack Start/Router · Tailwind v4 · Lovable Cloud
(PostgreSQL + Auth + RLS).

## Database (Phase 1)

**`schools`** — `id`, `name`, `code` (unique), `address`, `phone`, `email`,
`logo_url`, `status` (`active` | `inactive`), timestamps.

**`profiles`** — `id` (→ auth user, cascade), `school_id` (→ schools, restrict),
`full_name`, `phone`, `role` (`admin` | `attendant` | `parent`), `avatar_url`,
`status` (`active` | `inactive`), timestamps.

Role and status values are enforced by `CHECK` constraints — arbitrary roles are
impossible at the database level.

### Security helpers

`public.get_user_school_id()` and `public.get_user_role()` are `STABLE
SECURITY DEFINER` functions with an explicit `search_path = public, pg_temp`,
`EXECUTE` revoked from `PUBLIC`/`anon` and granted only to `authenticated`. They
derive the tenant and role from `auth.uid()` — never from the browser.

### Row level security

RLS is enabled on both tables.

| Table | Rule |
| --- | --- |
| `schools` | read only where `id = get_user_school_id()` |
| `profiles` | read own row, or rows in the same school |
| `profiles` | update own row only; `school_id`, `role` and `status` are pinned |

`role`, `school_id` and `status` are additionally forced back to their previous
values by the `profiles_protect_privileges` trigger whenever the request comes
from the `authenticated` role, so privilege escalation fails even if a policy is
later loosened. Profile and school creation/deletion are not granted to clients.

## Authentication & routing

- Email + password via Lovable Cloud Auth; sessions persist across refresh.
- `src/lib/auth.tsx` exposes `loading` / `unauthenticated` / `ready` /
  `incomplete` / `error` account states.
- `/` is the sign-in screen; signed-in users are routed by role.
- `src/routes/_authenticated/route.tsx` gates the protected subtree and redirects
  to `/`; `RoleGate` additionally keeps each role inside its own dashboard.
- Frontend guards are UX only. **RLS is the security boundary.**
- Users with no profile, an inactive profile or an unusable role get a safe
  account state — never admin access.

## Design system

All colour, typography, spacing, radius, shadow and effect values are tokens in
`src/styles.css` (obsidian base, midnight surfaces, crimson primary, cool accent,
Manrope). Components use semantic tokens and shared utilities
(`surface-1/2/3`, `surface-primary`, `atmosphere`, `route-motif`, `type-*`).
Never hardcode colours in components.

## Development accounts

Password for all demo accounts: `Passw0rd!Demo` (development only — never used in
production, and no credentials are embedded in the shipped frontend).

| School | Role | Email |
| --- | --- | --- |
| ACK St. Peters Academy (`ACK-SPA`) | admin | `admin.a@demo.test` |
| ACK St. Peters Academy | attendant | `attendant.a@demo.test` |
| ACK St. Peters Academy | parent | `parent.a@demo.test` |
| Demo Academy (`DEMO-001`) | admin | `admin.b@demo.test` |

Accounts were provisioned server-side with the service role key, which never
reaches the browser.

## Security tests (all expected to pass)

1. School isolation — School A user reading School B → 0 rows.
2. Profile isolation — School A user reading School B profiles → 0 rows.
3. Role escalation — `role = 'admin'` self-update → value unchanged.
4. School escalation — `school_id` self-update → value unchanged.
5. URL manipulation — attendant visiting `/admin` → redirected.
6. Session persistence — refresh keeps the session.
7. Logout — protected routes redirect to sign in.

## Not in Phase 1

Students, parent-child links, buses, routes, stops, assignments, trips, boarding/
alighting, GPS, notifications, billing, analytics, reports, incidents, CSV import,
offline sync, super-admin.
