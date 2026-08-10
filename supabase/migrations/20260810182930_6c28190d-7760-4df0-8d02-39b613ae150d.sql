
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (length(btrim(first_name)) BETWEEN 1 AND 60),
  last_name text NOT NULL CHECK (length(btrim(last_name)) BETWEEN 1 AND 60),
  admission_no text NOT NULL CHECK (length(btrim(admission_no)) BETWEEN 1 AND 40),
  grade_level text,
  class_name text,
  date_of_birth date,
  gender text CHECK (gender IN ('male','female','other')),
  home_address text,
  pickup_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT students_admission_unique UNIQUE (school_id, admission_no)
);

CREATE INDEX students_school_idx ON public.students(school_id);
CREATE INDEX students_name_idx ON public.students(school_id, last_name, first_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'guardian' CHECK (relationship IN ('mother','father','guardian','other')),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_guardian_unique UNIQUE (student_id, guardian_id)
);

CREATE INDEX student_guardians_guardian_idx ON public.student_guardians(guardian_id);
CREATE INDEX student_guardians_student_idx ON public.student_guardians(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_guardians TO authenticated;
GRANT ALL ON public.student_guardians TO service_role;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER students_touch_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Keep school_id honest: it must always match the row's own tenant chain.
CREATE OR REPLACE FUNCTION public.student_guardians_enforce_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s_school uuid; g_school uuid; g_role text;
BEGIN
  SELECT school_id INTO s_school FROM public.students WHERE id = NEW.student_id;
  SELECT school_id, role INTO g_school, g_role FROM public.profiles WHERE id = NEW.guardian_id;
  IF s_school IS NULL OR g_school IS NULL OR s_school <> g_school THEN
    RAISE EXCEPTION 'student and guardian must belong to the same school';
  END IF;
  IF g_role <> 'parent' THEN
    RAISE EXCEPTION 'guardian must be a parent account';
  END IF;
  NEW.school_id := s_school;
  RETURN NEW;
END; $$;

CREATE TRIGGER student_guardians_tenant
BEFORE INSERT OR UPDATE ON public.student_guardians
FOR EACH ROW EXECUTE FUNCTION public.student_guardians_enforce_tenant();

-- Helper: is this student linked to the current parent?
CREATE OR REPLACE FUNCTION public.is_my_child(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_guardians
    WHERE student_id = _student_id AND guardian_id = auth.uid()
  );
$$;

-- students policies
CREATE POLICY "students_admin_all" ON public.students FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');

CREATE POLICY "students_attendant_read" ON public.students FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'attendant');

CREATE POLICY "students_parent_read" ON public.students FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'parent' AND public.is_my_child(id));

-- student_guardians policies
CREATE POLICY "guardians_admin_all" ON public.student_guardians FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');

CREATE POLICY "guardians_parent_read" ON public.student_guardians FOR SELECT TO authenticated
  USING (guardian_id = auth.uid());

CREATE POLICY "guardians_attendant_read" ON public.student_guardians FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'attendant');

-- Demo data
INSERT INTO public.students (id, school_id, first_name, last_name, admission_no, grade_level, class_name, date_of_birth, gender, home_address, pickup_notes)
VALUES
  ('11111111-1111-4111-8111-000000000001', (SELECT id FROM public.schools WHERE code='ACK-SPA'), 'Zawadi', 'Mwangi', 'SPA-2401', 'Grade 4', '4 Blue', '2016-03-14', 'female', 'Kileleshwa, Nairobi', 'Waits at the blue gate with the housekeeper.'),
  ('11111111-1111-4111-8111-000000000002', (SELECT id FROM public.schools WHERE code='ACK-SPA'), 'Baraka', 'Mwangi', 'SPA-2402', 'Grade 1', '1 Green', '2019-08-02', 'male', 'Kileleshwa, Nairobi', 'Travels with his older sister.'),
  ('11111111-1111-4111-8111-000000000003', (SELECT id FROM public.schools WHERE code='ACK-SPA'), 'Neema', 'Achieng', 'SPA-2403', 'Grade 6', '6 Red', '2014-11-21', 'female', 'Lavington, Nairobi', NULL),
  ('11111111-1111-4111-8111-000000000004', (SELECT id FROM public.schools WHERE code='ACK-SPA'), 'Tendai', 'Kirui', 'SPA-2404', 'Grade 3', '3 Blue', '2017-05-09', 'male', 'Westlands, Nairobi', 'Afternoon drop-off only.'),
  ('11111111-1111-4111-8111-000000000005', (SELECT id FROM public.schools WHERE code='ACK-SPA'), 'Amara', 'Njoroge', 'SPA-2405', 'Grade 8', '8 Gold', '2012-01-30', 'female', 'Kilimani, Nairobi', NULL),
  ('22222222-2222-4222-8222-000000000001', (SELECT id FROM public.schools WHERE code='DEMO-001'), 'Lucas', 'Omondi', 'DEM-1001', 'Grade 5', '5 East', '2015-07-18', 'male', 'Demo Estate', NULL);

INSERT INTO public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary)
VALUES
  ((SELECT id FROM public.schools WHERE code='ACK-SPA'), '11111111-1111-4111-8111-000000000001', '2558bb06-2fc9-4f92-aeab-b31a8467ebb2', 'mother', true),
  ((SELECT id FROM public.schools WHERE code='ACK-SPA'), '11111111-1111-4111-8111-000000000002', '2558bb06-2fc9-4f92-aeab-b31a8467ebb2', 'mother', true);
