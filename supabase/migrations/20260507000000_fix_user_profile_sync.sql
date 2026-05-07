-- Fix: do not overwrite user-edited profile fields from auth.users metadata.
--
-- Problem: the trigger syncing auth.users -> public.users ran on every auth.users
-- update and would overwrite public.users.full_name / avatar_url with values from
-- auth metadata (e.g. Google avatar), causing the app avatar to "disappear" or
-- flip back for some accounts.
--
-- Desired behaviour: keep email in sync, but only fill full_name/avatar_url from
-- auth metadata when the public.users value is still NULL.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(public.users.full_name,  excluded.full_name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
        updated_at = now();
  return new;
end;
$$;
