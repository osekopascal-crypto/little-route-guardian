
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (recipient_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications readable" ON public.notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "own notifications updatable" ON public.notifications
  FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "own notifications deletable" ON public.notifications
  FOR DELETE TO authenticated USING (recipient_id = auth.uid());

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','parent','attendant')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX announcements_school_idx ON public.announcements (school_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "school members read announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (audience = 'all' OR audience = public.get_user_role() OR public.get_user_role() = 'admin')
  );
CREATE POLICY "admins insert announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin' AND author_id = auth.uid());
CREATE POLICY "admins update announcements" ON public.announcements
  FOR UPDATE TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');
CREATE POLICY "admins delete announcements" ON public.announcements
  FOR DELETE TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');

-- Fan out an announcement to its audience as personal alerts
CREATE OR REPLACE FUNCTION public.announcement_fanout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body)
  SELECT NEW.school_id, p.id, 'announcement', NEW.title, NEW.body
  FROM public.profiles p
  WHERE p.school_id = NEW.school_id
    AND p.id <> NEW.author_id
    AND (NEW.audience = 'all' OR p.role = NEW.audience);
  RETURN NEW;
END; $$;

CREATE TRIGGER announcements_fanout AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.announcement_fanout();

-- Alert guardians when a pupil's ride status changes
CREATE OR REPLACE FUNCTION public.notify_rider_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  t record;
  ttl text;
  msg text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT id, full_name, school_id INTO s FROM public.students WHERE id = NEW.student_id;
  SELECT tr.id, tr.direction INTO t FROM public.trips tr WHERE tr.id = NEW.trip_id;

  IF NEW.status = 'on_board' THEN
    ttl := s.full_name || ' is on the bus';
    msg := 'Boarded safely' || CASE WHEN t.direction = 'to_school' THEN ' on the way to school.' ELSE ' on the way home.' END;
  ELSIF NEW.status = 'dropped' THEN
    ttl := s.full_name || ' has been dropped off';
    msg := CASE WHEN t.direction = 'to_school' THEN 'Arrived at school safely.' ELSE 'Dropped at the stop safely.' END;
  ELSIF NEW.status = 'absent' THEN
    ttl := s.full_name || ' was marked absent';
    msg := 'The attendant did not find them at the stop today.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
  SELECT s.school_id, sg.guardian_id, 'ride', ttl, msg, s.id, NEW.trip_id
  FROM public.student_guardians sg
  WHERE sg.student_id = NEW.student_id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trip_students_notify AFTER UPDATE ON public.trip_students
  FOR EACH ROW EXECUTE FUNCTION public.notify_rider_status();

-- Alert guardians when a run starts or finishes
CREATE OR REPLACE FUNCTION public.notify_trip_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ttl text;
  msg text;
  rname text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT name INTO rname FROM public.routes WHERE id = NEW.route_id;

  IF NEW.status = 'in_progress' THEN
    ttl := 'The bus has started its run';
    msg := coalesce(rname, 'The route') || CASE WHEN NEW.direction = 'to_school' THEN ' — morning pickup is underway.' ELSE ' — afternoon drop-off is underway.' END;
  ELSIF NEW.status = 'completed' THEN
    ttl := 'The run has finished';
    msg := coalesce(rname, 'The route') || ' has completed today''s journey.';
  ELSIF NEW.status = 'cancelled' THEN
    ttl := 'Today''s run was cancelled';
    msg := coalesce(rname, 'The route') || ' will not run today. Please make other arrangements.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
  SELECT DISTINCT st.school_id, sg.guardian_id, 'trip', ttl, msg, st.id, NEW.id
  FROM public.trip_students ts
  JOIN public.students st ON st.id = ts.student_id
  JOIN public.student_guardians sg ON sg.student_id = ts.student_id
  WHERE ts.trip_id = NEW.id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trips_notify AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.notify_trip_status();
