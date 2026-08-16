-- ============ FLEET ============
CREATE TABLE public.buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plate_no text NOT NULL,
  label text NOT NULL,
  capacity integer NOT NULL DEFAULT 40 CHECK (capacity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buses_plate_unique UNIQUE (school_id, plate_no)
);

CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  corridor text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT routes_code_unique UNIQUE (school_id, code)
);

CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  sequence integer NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  pickup_time time,
  dropoff_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT route_stops_sequence_unique UNIQUE (route_id, sequence)
);

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  attendant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  trip_date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL DEFAULT 'to_school' CHECK (direction IN ('to_school','from_school')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  current_stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trips_school_date_idx ON public.trips (school_id, trip_date DESC);

CREATE TABLE public.trip_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','on_board','dropped','absent')),
  boarded_at timestamptz,
  dropped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_students_unique UNIQUE (trip_id, student_id)
);

CREATE TABLE public.bus_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed_kph double precision,
  heading double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bus_positions_trip_idx ON public.bus_positions (trip_id, recorded_at DESC);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bus_positions TO authenticated;
GRANT ALL ON public.buses, public.routes, public.route_stops, public.trips, public.trip_students, public.bus_positions TO service_role;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_my_child_trip(_trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_students ts
    JOIN public.student_guardians sg ON sg.student_id = ts.student_id
    WHERE ts.trip_id = _trip_id AND sg.guardian_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_my_child_route(_route_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.trip_students ts ON ts.trip_id = t.id
    JOIN public.student_guardians sg ON sg.student_id = ts.student_id
    WHERE t.route_id = _route_id AND sg.guardian_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_my_child_bus(_bus_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.trip_students ts ON ts.trip_id = t.id
    JOIN public.student_guardians sg ON sg.student_id = ts.student_id
    WHERE t.bus_id = _bus_id AND sg.guardian_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_my_child_trip(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_my_child_route(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_my_child_bus(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_my_child_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_child_route(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_child_bus(uuid) TO authenticated;

CREATE TRIGGER buses_touch BEFORE UPDATE ON public.buses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER routes_touch BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trips_touch BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trip_students_touch BEFORE UPDATE ON public.trip_students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RLS ============
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_positions ENABLE ROW LEVEL SECURITY;

-- buses
CREATE POLICY buses_admin_all ON public.buses FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'admin')
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'admin');
CREATE POLICY buses_attendant_read ON public.buses FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant');
CREATE POLICY buses_parent_read ON public.buses FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'parent' AND is_my_child_bus(id));

-- routes
CREATE POLICY routes_admin_all ON public.routes FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'admin')
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'admin');
CREATE POLICY routes_attendant_read ON public.routes FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant');
CREATE POLICY routes_parent_read ON public.routes FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'parent' AND is_my_child_route(id));

-- route_stops
CREATE POLICY route_stops_admin_all ON public.route_stops FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'admin')
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'admin');
CREATE POLICY route_stops_attendant_read ON public.route_stops FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant');
CREATE POLICY route_stops_parent_read ON public.route_stops FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'parent' AND is_my_child_route(route_id));

-- trips
CREATE POLICY trips_admin_all ON public.trips FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'admin')
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'admin');
CREATE POLICY trips_attendant_read ON public.trips FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant');
CREATE POLICY trips_attendant_update ON public.trips FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant' AND attendant_id = auth.uid())
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'attendant' AND attendant_id = auth.uid());
CREATE POLICY trips_parent_read ON public.trips FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'parent' AND is_my_child_trip(id));

-- trip_students
CREATE POLICY trip_students_admin_all ON public.trip_students FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'admin')
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'admin');
CREATE POLICY trip_students_attendant_read ON public.trip_students FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant');
CREATE POLICY trip_students_attendant_update ON public.trip_students FOR UPDATE TO authenticated
  USING (
    school_id = get_user_school_id() AND get_user_role() = 'attendant'
    AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.attendant_id = auth.uid())
  )
  WITH CHECK (
    school_id = get_user_school_id() AND get_user_role() = 'attendant'
    AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.attendant_id = auth.uid())
  );
CREATE POLICY trip_students_parent_read ON public.trip_students FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'parent' AND is_my_child(student_id));

-- bus_positions
CREATE POLICY bus_positions_admin_all ON public.bus_positions FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'admin')
  WITH CHECK (school_id = get_user_school_id() AND get_user_role() = 'admin');
CREATE POLICY bus_positions_attendant_read ON public.bus_positions FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'attendant');
CREATE POLICY bus_positions_attendant_insert ON public.bus_positions FOR INSERT TO authenticated
  WITH CHECK (
    school_id = get_user_school_id() AND get_user_role() = 'attendant'
    AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.attendant_id = auth.uid())
  );
CREATE POLICY bus_positions_parent_read ON public.bus_positions FOR SELECT TO authenticated
  USING (school_id = get_user_school_id() AND get_user_role() = 'parent' AND is_my_child_trip(trip_id));

-- ============ DEMO SEED (ACK St. Peters Academy) ============
INSERT INTO public.buses (id, school_id, plate_no, label, capacity, status) VALUES
  ('aaaa1111-0000-4000-8000-000000000001','d83bac75-480c-4b79-98c7-e52d15b6f951','KDJ 512A','Bus 1 · Kiambu Wing',42,'active'),
  ('aaaa1111-0000-4000-8000-000000000002','d83bac75-480c-4b79-98c7-e52d15b6f951','KCX 884Q','Bus 2 · Ruiru Wing',36,'active');

INSERT INTO public.routes (id, school_id, name, code, corridor, status) VALUES
  ('bbbb1111-0000-4000-8000-000000000001','d83bac75-480c-4b79-98c7-e52d15b6f951','Kiambu – Ndumberi Corridor','R-KIA-01','Kiambu Stage → Ndumberi → Riabai → School','active'),
  ('bbbb1111-0000-4000-8000-000000000002','d83bac75-480c-4b79-98c7-e52d15b6f951','Ruiru – Kamiti Corridor','R-RUI-02','Ruiru Town → Kamiti → School','active');

INSERT INTO public.route_stops (id, school_id, route_id, name, sequence, lat, lng, pickup_time, dropoff_time) VALUES
  ('cccc1111-0000-4000-8000-000000000001','d83bac75-480c-4b79-98c7-e52d15b6f951','bbbb1111-0000-4000-8000-000000000001','Kiambu Stage',1,-1.17140,36.83560,'06:30','16:50'),
  ('cccc1111-0000-4000-8000-000000000002','d83bac75-480c-4b79-98c7-e52d15b6f951','bbbb1111-0000-4000-8000-000000000001','Ndumberi Market',2,-1.15600,36.83100,'06:45','16:35'),
  ('cccc1111-0000-4000-8000-000000000003','d83bac75-480c-4b79-98c7-e52d15b6f951','bbbb1111-0000-4000-8000-000000000001','Riabai Junction',3,-1.14300,36.82200,'06:58','16:20'),
  ('cccc1111-0000-4000-8000-000000000004','d83bac75-480c-4b79-98c7-e52d15b6f951','bbbb1111-0000-4000-8000-000000000001','Ting''ang''a Shops',4,-1.13100,36.81300,'07:10','16:05'),
  ('cccc1111-0000-4000-8000-000000000005','d83bac75-480c-4b79-98c7-e52d15b6f951','bbbb1111-0000-4000-8000-000000000001','ACK St. Peters Academy',5,-1.12000,36.80500,'07:25','15:50');

INSERT INTO public.trips (id, school_id, route_id, bus_id, attendant_id, trip_date, direction, status, current_stop_id, started_at) VALUES
  ('dddd1111-0000-4000-8000-000000000001','d83bac75-480c-4b79-98c7-e52d15b6f951','bbbb1111-0000-4000-8000-000000000001','aaaa1111-0000-4000-8000-000000000001','2eccfef3-fe50-4e90-89a0-a823ec0442bf',CURRENT_DATE,'to_school','in_progress','cccc1111-0000-4000-8000-000000000003',now() - interval '22 minutes');

INSERT INTO public.trip_students (school_id, trip_id, student_id, stop_id, status, boarded_at) VALUES
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000001','cccc1111-0000-4000-8000-000000000001','on_board', now() - interval '20 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000002','cccc1111-0000-4000-8000-000000000001','on_board', now() - interval '20 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000003','cccc1111-0000-4000-8000-000000000002','on_board', now() - interval '9 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000004','cccc1111-0000-4000-8000-000000000003','waiting', NULL),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','11111111-1111-4111-8111-000000000005','cccc1111-0000-4000-8000-000000000004','waiting', NULL);

INSERT INTO public.bus_positions (school_id, trip_id, bus_id, lat, lng, speed_kph, heading, recorded_at) VALUES
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','aaaa1111-0000-4000-8000-000000000001',-1.17140,36.83560,0,340,now() - interval '21 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','aaaa1111-0000-4000-8000-000000000001',-1.16400,36.83300,34,338,now() - interval '15 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','aaaa1111-0000-4000-8000-000000000001',-1.15600,36.83100,12,335,now() - interval '9 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','aaaa1111-0000-4000-8000-000000000001',-1.14900,36.82600,38,330,now() - interval '4 minutes'),
  ('d83bac75-480c-4b79-98c7-e52d15b6f951','dddd1111-0000-4000-8000-000000000001','aaaa1111-0000-4000-8000-000000000001',-1.14650,36.82400,41,328,now() - interval '1 minute');