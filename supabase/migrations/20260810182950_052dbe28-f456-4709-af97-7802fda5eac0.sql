
REVOKE ALL ON FUNCTION public.get_user_school_id() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_user_role() FROM anon, public;
REVOKE ALL ON FUNCTION public.is_my_child(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.student_guardians_enforce_tenant() FROM anon, public, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_child(uuid) TO authenticated;
