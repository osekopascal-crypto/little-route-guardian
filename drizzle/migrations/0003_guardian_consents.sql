CREATE TABLE public.guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  consent_given_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  UNIQUE (guardian_id, consent_version)
);
GRANT SELECT, INSERT ON public.guardian_consents TO authenticated;
GRANT ALL ON public.guardian_consents TO service_role;
ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guardians read own consents" ON public.guardian_consents FOR SELECT TO authenticated
  USING (guardian_id = auth.uid());
CREATE POLICY "Admins read school consents" ON public.guardian_consents FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');
CREATE POLICY "Guardians record own consent" ON public.guardian_consents FOR INSERT TO authenticated
  WITH CHECK (guardian_id = auth.uid() AND school_id = public.get_user_school_id() AND public.get_user_role() = 'parent');