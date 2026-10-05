# Phase 9 — Reports, Safety & Launch Readiness

This is the last phase. It adds reports for school admins, a log for safety incidents, and final checks before launch.

## 1. Safety incidents
- Attendants can report an incident from their "Today" screen. Types: delay, breakdown, road issue, pupil behaviour, injury or other. Each has a severity (low, medium or high), a short description and an optional link to a pupil.
- A new **Incidents** tab for admins lists open and resolved incidents. Admins can resolve an incident with a note.
- When an incident is high severity or names a pupil, that pupil's parents get an alert written in plain words, for example "Bus delayed — about 15 min late". Every admin also gets an alert.
- The admin dashboard's "Alerts" box currently shows two made-up alerts. It will show the latest real open incidents instead.

## 2. Reports (admin)
A new **Reports** tab, with a date range filter (this week, this month, this term, or custom dates):
- **Attendance:** boarded, dropped off and absent counts for each pupil and each route.
- **Trips:** runs completed and cancelled, and on-time starts compared with the planned first pickup time.
- **Fees:** amount billed, collected and still owed per term, the list of pupils with unpaid fees, and how payments were made (M-Pesa, cash or bank).
- **Safety:** incidents by type and severity, and how long they took to resolve.
- Each table has a **Download CSV** button so it can be opened in Excel.

## 3. Launch readiness
- Rewrite the README so it describes the finished system: every role, tab and security rule.
- Give every page its own clear title, and check that pages work on phones.
- Run the security scan and database checks again, and fix anything new they find.
- Test in a browser as admin, attendant and parent: sign in, open each tab, report an incident, then resolve it.
- Hand you a go-live checklist: remove or replace the demo accounts, add your real school, pupils and parents, and publish.

## Not included
- Sending alerts by SMS or email, and parents paying by M-Pesa from their phone. Both need a paid account from an outside provider and can be added later.
- A platform-wide super-admin who manages all schools.

## Technical details
- New `incidents` table with these columns: school_id, trip_id?, bus_id?, student_id?, reported_by, kind, severity, description, status (open/resolved), resolved_by?, resolved_at?, resolution_note?, timestamps. It gets GRANTs and RLS: attendants insert and read incidents they reported; admins have full access within their school; parents read incidents linked to their own child.
- A security-definer trigger fans incident alerts out into `notifications` (kind `incident`), with EXECUTE revoked from clients.
- Reports are computed in the browser from the existing tables, which RLS already limits to the user's own school: `trip_students`, `trips`, `route_stops`, `fee_invoices`, `fee_payments` and `incidents`. CSV files are built in the browser too, so no server code is needed.
- New files: `src/lib/incidents.ts`, `src/lib/reports.ts`, and the routes `/_authenticated/incidents` and `/_authenticated/reports`. The nav in `app-shell.tsx` gets two admin entries.
