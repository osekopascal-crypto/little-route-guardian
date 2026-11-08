DROP POLICY IF EXISTS "Users can view profiles in their own school" ON public.profiles;
CREATE POLICY "Users can view permitted profiles in their school"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (
    school_id = public.get_user_school_id()
    AND (
      public.get_user_role() IN ('admin','attendant')
      OR role IN ('admin','attendant')
    )
  )
);