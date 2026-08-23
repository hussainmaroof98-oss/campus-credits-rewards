REVOKE EXECUTE ON FUNCTION public.recompute_campus_stats() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.point_ledger_recompute() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;