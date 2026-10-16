CREATE OR REPLACE FUNCTION public.notify_rider_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s record; t record; nm text; ttl text; msg text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT id, first_name, last_name, school_id INTO s FROM public.students WHERE id = NEW.student_id;
  nm := trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''));
  SELECT tr.id, tr.direction INTO t FROM public.trips tr WHERE tr.id = NEW.trip_id;
  IF NEW.status = 'on_board' THEN
    ttl := nm || ' is on the bus';
    msg := 'Boarded safely' || CASE WHEN t.direction = 'to_school' THEN ' on the way to school.' ELSE ' on the way home.' END;
  ELSIF NEW.status = 'dropped' THEN
    ttl := nm || ' has been dropped off';
    msg := CASE WHEN t.direction = 'to_school' THEN 'Arrived at school safely.' ELSE 'Dropped at the stop safely.' END;
  ELSIF NEW.status = 'absent' THEN
    ttl := nm || ' was marked absent';
    msg := 'The attendant did not find them at the stop today.';
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id, trip_id)
  SELECT s.school_id, sg.guardian_id, 'ride', ttl, msg, s.id, NEW.trip_id
  FROM public.student_guardians sg WHERE sg.student_id = NEW.student_id;
  RETURN NEW;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.notify_rider_status() FROM anon, authenticated, public;