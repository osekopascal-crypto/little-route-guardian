# School Transport SaaS

A multi-tenant school transport platform for Kenyan schools. Each school is a
tenant; every school-owned row carries `school_id` and is isolated by row level
security (RLS). Powered by Pasco Labs.

## Roles and screens

| Role | Screens |
| --- | --- |
| School admin | Overview, Pupils, Fleet, Routes, Trips, Fees, Incidents, Reports, Notices |
| Bus attendant | Today (run trip, board/drop/absent, share GPS, report incident), Notices |
| Parent | My children, live bus tracking, Fees, Notices |

## Features by phase

1. **Foundation** — schools, profiles, auth, role routing, tenant RLS.
2. **Pupils & families** — students, guardian links.
3–4. **Design system** — ivory/amber glass, Sora + Manrope, localized data.
5. **Live tracking** — buses, routes, stops, trips, manifests, GPS positions.
6. **Fleet & scheduling** — bus/route/stop/trip admin and rosters.
7. **Notifications** — in-app alerts and school notice board; automatic alerts
   when a run starts/ends or a pupil boards, is dropped or marked absent.
8. **Transport fees** — termly fees per pupil, M-Pesa/cash/bank payments
   recorded by the office, balances, payment receipts sent to parents.
9. **Reports & safety** — attendant incident reports (alerting admins, and
   parents when their child is named or the incident is high severity),
   admin resolution log, and reports for attendance, trip punctuality, fees and
   safety with CSV downloads.

## Security model

- Helpers `get_user_school_id()`, `get_user_role()`, `is_my_child*()` are
  `SECURITY DEFINER` and derive tenant/role from `auth.uid()` only.
- Every table has RLS: admins manage their own school; attendants act on their
  assigned trips and their own incident reports; parents read only data tied
  to their linked children.
- `profiles_protect_privileges` pins `role`, `school_id` and `status` against
  self-escalation.
- Notification fan-out triggers are `SECURITY DEFINER` with client `EXECUTE`
  revoked; clients cannot insert notifications directly.
- Frontend role gates are UX only. **RLS is the security boundary.**

## Demo accounts (development only)

Password: `Passw0rd!Demo`

| School | Role | Email |
| --- | --- | --- |
| ACK St. Peters Academy | admin | `admin.a@demo.test` |
| ACK St. Peters Academy | attendant | `attendant.a@demo.test` |
| ACK St. Peters Academy | parent | `parent.a@demo.test` |
| Demo Academy | admin | `admin.b@demo.test` |

## Go-live checklist

1. Remove or replace demo accounts, pupils and Demo Academy.
2. Create your real school, admin, attendants, parents and pupils.
3. Set routes, stops, buses and the first trips.
4. Publish.

Not included yet: SMS/email delivery and in-app M-Pesa checkout (both need an
external provider account), and a platform-wide super-admin.
