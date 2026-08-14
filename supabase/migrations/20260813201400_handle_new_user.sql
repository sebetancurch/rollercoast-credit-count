-- Create the profile row when someone signs up.
--
-- The client cannot do this: `authenticated` has no INSERT privilege on
-- profiles, and at signup there is no session yet anyway. A definer trigger on
-- auth.users is the standard seam.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, role, leaderboard_opt_in)
  values (
    new.id,
    -- The signup form sends display_name in the user metadata. Fall back to the
    -- local part of the email so a profile always exists, then make it unique so
    -- the insert cannot fail and take the signup down with it.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    ) || case
      when exists (
        select 1 from public.profiles
        where username = coalesce(
          nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
          split_part(new.email, '@', 1)
        )
      )
      then '-' || substr(new.id::text, 1, 8)
      else ''
    end,
    -- Role is never taken from user metadata. A signup payload is client-
    -- controlled, so honouring a role from it would hand out admin on request.
    'enthusiast',
    -- Private by default.
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nothing calls this directly; it only runs as a trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
