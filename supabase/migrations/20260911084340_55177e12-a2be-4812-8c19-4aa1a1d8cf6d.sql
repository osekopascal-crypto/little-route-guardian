
REVOKE EXECUTE ON FUNCTION public.announcement_fanout() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_rider_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_trip_status() FROM anon, authenticated, public;
