ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name text, ADD COLUMN IF NOT EXISTS guardian_phone text, ADD COLUMN IF NOT EXISTS guardian_relationship text;
ALTER TABLE public.trip_students ADD COLUMN IF NOT EXISTS parent_absent_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_not_riding_today(_student_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_my_child(_student_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE public.trip_students ts SET status = 'absent', parent_absent_at = now()
  FROM public.trips t
  WHERE ts.trip_id = t.id AND ts.student_id = _student_id
    AND t.trip_date = (now() AT TIME ZONE 'Africa/Nairobi')::date
    AND t.status IN ('planned','in_progress') AND ts.status = 'waiting';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.mark_not_riding_today(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_not_riding_today(uuid) TO authenticated;