DROP POLICY IF EXISTS "attendants report incidents" ON public.incidents;
CREATE POLICY "attendants report incidents" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND public.get_user_role() = 'attendant'
    AND reported_by = auth.uid()
    AND status = 'open'
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = incidents.student_id
          AND s.school_id = incidents.school_id
      )
    )
  );

CREATE OR REPLACE FUNCTION public.notify_incident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ttl text;
  sname text;
BEGIN
  IF NEW.student_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = NEW.student_id
      AND s.school_id = NEW.school_id
  ) THEN
    RAISE EXCEPTION 'incident student must belong to incident school';
  END IF;

  IF NEW.trip_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = NEW.trip_id
      AND t.school_id = NEW.school_id
  ) THEN
    RAISE EXCEPTION 'incident trip must belong to incident school';
  END IF;

  ttl := CASE NEW.kind
    WHEN 'delay' THEN 'Bus delayed'
    WHEN 'breakdown' THEN 'Bus breakdown reported'
    WHEN 'road' THEN 'Road issue on the route'
    WHEN 'behaviour' THEN 'Behaviour note from the bus'
    WHEN 'injury' THEN 'Injury reported on the bus'
    ELSE 'Update from the bus'
  END;

  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
  SELECT NEW.school_id, p.id, 'incident', ttl || ' (' || NEW.severity || ')', NEW.description, NEW.student_id, NEW.trip_id
  FROM public.profiles p
  WHERE p.school_id = NEW.school_id
    AND p.role = 'admin'
    AND p.id <> NEW.reported_by;

  IF NEW.student_id IS NOT NULL THEN
    SELECT s.first_name INTO sname
    FROM public.students s
    WHERE s.id = NEW.student_id
      AND s.school_id = NEW.school_id;

    INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
    SELECT NEW.school_id, sg.guardian_id, 'incident', ttl || ' — ' || coalesce(sname, 'your child'), NEW.description, NEW.student_id, NEW.trip_id
    FROM public.student_guardians sg
    JOIN public.students s
      ON s.id = sg.student_id
     AND s.school_id = NEW.school_id
    WHERE sg.student_id = NEW.student_id
      AND sg.school_id = NEW.school_id;
  ELSIF NEW.severity = 'high' AND NEW.trip_id IS NOT NULL THEN
    INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, trip_id)
    SELECT DISTINCT NEW.school_id, sg.guardian_id, 'incident', ttl, NEW.description, NEW.trip_id
    FROM public.trip_students ts
    JOIN public.students s
      ON s.id = ts.student_id
     AND s.school_id = NEW.school_id
    JOIN public.student_guardians sg
      ON sg.student_id = s.id
     AND sg.school_id = NEW.school_id
    WHERE ts.trip_id = NEW.trip_id
      AND ts.school_id = NEW.school_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_incident() FROM anon, authenticated, public;