CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  reported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('delay','breakdown','road','behaviour','injury','other')),
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incidents_school_idx ON public.incidents (school_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage school incidents" ON public.incidents
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');

CREATE POLICY "attendants report incidents" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'attendant'
              AND reported_by = auth.uid() AND status = 'open');

CREATE POLICY "attendants read own incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND reported_by = auth.uid());

CREATE POLICY "parents read child incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND student_id IS NOT NULL AND public.is_my_child(student_id));

CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.notify_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ttl text; sname text;
BEGIN
  ttl := CASE NEW.kind
    WHEN 'delay' THEN 'Bus delayed'
    WHEN 'breakdown' THEN 'Bus breakdown reported'
    WHEN 'road' THEN 'Road issue on the route'
    WHEN 'behaviour' THEN 'Behaviour note from the bus'
    WHEN 'injury' THEN 'Injury reported on the bus'
    ELSE 'Update from the bus' END;

  -- admins in the school
  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
  SELECT NEW.school_id, p.id, 'incident', ttl || ' (' || NEW.severity || ')', NEW.description, NEW.student_id, NEW.trip_id
  FROM public.profiles p
  WHERE p.school_id = NEW.school_id AND p.role = 'admin' AND p.id <> NEW.reported_by;

  -- parents of the named child
  IF NEW.student_id IS NOT NULL THEN
    SELECT first_name INTO sname FROM public.students WHERE id = NEW.student_id;
    INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
    SELECT NEW.school_id, sg.guardian_id, 'incident', ttl || ' — ' || coalesce(sname, 'your child'), NEW.description, NEW.student_id, NEW.trip_id
    FROM public.student_guardians sg WHERE sg.student_id = NEW.student_id;
  ELSIF NEW.severity = 'high' AND NEW.trip_id IS NOT NULL THEN
    INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, trip_id)
    SELECT DISTINCT NEW.school_id, sg.guardian_id, 'incident', ttl, NEW.description, NEW.trip_id
    FROM public.trip_students ts JOIN public.student_guardians sg ON sg.student_id = ts.student_id
    WHERE ts.trip_id = NEW.trip_id;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_incident() FROM anon, authenticated, public;

CREATE TRIGGER incidents_notify AFTER INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.notify_incident();