-- Security Advisor: anon/authenticated must not call SECURITY DEFINER RPCs directly.
-- Triggers (handle_new_user) and seed scripts (truncate_ndc_products via service role)
-- continue to work without public EXECUTE grants.

revoke all on function public.truncate_ndc_products() from public;
revoke all on function public.handle_new_user() from public;

revoke all on function public.truncate_ndc_products() from anon, authenticated;
revoke all on function public.handle_new_user() from anon, authenticated;

grant execute on function public.truncate_ndc_products() to service_role;
