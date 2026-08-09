REVOKE ALL ON FUNCTION public.get_user_school_id() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;