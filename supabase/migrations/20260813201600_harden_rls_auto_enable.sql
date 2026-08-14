-- Advisor hygiene for a function this project did not create.
--
-- The hosted project carries public.rls_auto_enable(), installed by the Vercel
-- Supabase integration. It is an event-trigger function that enables RLS on any
-- new table in `public` — useful, and it stays.
--
-- Supabase's linter flags it because anon and authenticated hold EXECUTE, so it
-- is reachable at /rest/v1/rpc/rls_auto_enable. Calling it that way would error
-- (an event-trigger function cannot run outside its trigger), so this is not a
-- live hole — but an unused EXECUTE grant on a SECURITY DEFINER function is not
-- worth keeping, and a clean advisor report is worth more than a warning
-- everyone learns to scroll past.
--
-- Guarded: the function is part of the hosted project's provisioning and does
-- not exist in a local stack, where this migration must still apply cleanly.

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
    raise notice 'revoked execute on public.rls_auto_enable()';
  else
    raise notice 'public.rls_auto_enable() not present; nothing to revoke';
  end if;
end
$$;
