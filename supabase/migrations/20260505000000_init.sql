-- Disc Golf Tracker – initial schema
-- Run with: supabase db push  (or paste into the SQL editor in the dashboard)

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type friendship_status as enum ('pending', 'accepted', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type game_status as enum ('scheduled', 'in_progress', 'finished', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================
-- users  (mirror auth.users for joins and profiles)
-- ============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext not null unique,
  full_name   text,
  avatar_url  text,
  username    citext unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigram index for ILIKE %query% on full_name (text). The unique constraint
-- on username already builds a b-tree which suffices for prefix lookups; a
-- gin_trgm_ops index on (username::text) would be unused by `username ILIKE …`
-- because the planner won't rewrite to the cast expression.
create index if not exists users_full_name_trgm
  on public.users using gin (full_name gin_trgm_ops);

-- Trigger: copy new users from auth.users
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
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name,  public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.ensure_user_profile()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_profile public.users;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth' using errcode = 'P0001';
  end if;

  v_email := coalesce(auth.jwt() ->> 'email', '');

  insert into public.users (id, email, full_name, avatar_url)
  values (
    v_user_id,
    v_email,
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = case
          when excluded.email <> '' then excluded.email
          else public.users.email
        end,
        full_name = coalesce(public.users.full_name, excluded.full_name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

-- ============================================================
-- friendships  (directional invitations with status)
-- ============================================================
create table if not exists public.friendships (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid not null references public.users(id) on delete cascade,
  addressee_id  uuid not null references public.users(id) on delete cascade,
  status        friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

-- ============================================================
-- courses + holes
-- ============================================================
create table if not exists public.courses (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  slug         text not null unique,
  city         text,
  region       text,
  country      text not null default 'PL',
  latitude     double precision,
  longitude    double precision,
  description  text,
  hole_count   int  not null default 0,
  total_par    int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists courses_country_idx on public.courses (country);
create index if not exists courses_city_idx on public.courses (city);

create table if not exists public.holes (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  number      int  not null check (number > 0),
  par         int  not null check (par between 2 and 7),
  distance_m  int,
  notes       text,
  constraint holes_unique_per_course unique (course_id, number)
);

create index if not exists holes_course_idx on public.holes (course_id);

-- Aggregate hole_count + total_par on courses on hole change.
create or replace function public.recalc_course_aggregates()
returns trigger
language plpgsql
as $$
declare
  v_course_id uuid;
begin
  v_course_id := coalesce(new.course_id, old.course_id);
  update public.courses c
  set hole_count = sub.cnt,
      total_par  = sub.par_sum,
      updated_at = now()
  from (
    select count(*)::int as cnt, coalesce(sum(par),0)::int as par_sum
    from public.holes where course_id = v_course_id
  ) sub
  where c.id = v_course_id;
  return null;
end;
$$;

drop trigger if exists holes_recalc_aggregates on public.holes;
create trigger holes_recalc_aggregates
  after insert or update or delete on public.holes
  for each row execute function public.recalc_course_aggregates();

-- ============================================================
-- games + game_players + scores
-- ============================================================
create table if not exists public.games (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid not null references public.courses(id) on delete restrict,
  host_id      uuid not null references public.users(id)   on delete cascade,
  name         text,
  notes        text,
  status       game_status not null default 'scheduled',
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.games add column if not exists notes text;

create index if not exists games_host_idx       on public.games (host_id);
create index if not exists games_course_idx     on public.games (course_id);
create index if not exists games_status_idx     on public.games (status);
create index if not exists games_started_at_idx on public.games (started_at desc);

create table if not exists public.game_players (
  id            uuid primary key default uuid_generate_v4(),
  game_id       uuid not null references public.games(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  display_name  text,
  position      int  not null default 1,
  joined_at     timestamptz not null default now(),
  constraint game_players_unique unique (game_id, user_id)
);

create index if not exists game_players_game_idx on public.game_players (game_id);
create index if not exists game_players_user_idx on public.game_players (user_id);

create table if not exists public.scores (
  id              uuid primary key default uuid_generate_v4(),
  game_id         uuid not null references public.games(id)        on delete cascade,
  game_player_id  uuid not null references public.game_players(id) on delete cascade,
  hole_id         uuid not null references public.holes(id)        on delete restrict,
  strokes         int  not null check (strokes between 1 and 20),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint scores_unique_player_hole unique (game_player_id, hole_id)
);

create index if not exists scores_game_idx        on public.scores (game_id);
create index if not exists scores_game_player_idx on public.scores (game_player_id);
create index if not exists scores_hole_idx        on public.scores (hole_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'users','friendships','courses','games','scores'
  ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================
-- View: leaderboard per game
--   security_invoker = on so RLS of the underlying tables (games / scores /
--   game_players) applies — otherwise this view would let any authenticated
--   user read the score history of any other user.
-- ============================================================
create or replace view public.game_leaderboard
  with (security_invoker = on)
as
select
  g.id                                                       as game_id,
  gp.id                                                      as game_player_id,
  gp.user_id                                                 as user_id,
  gp.display_name                                            as display_name,
  u.full_name                                                as full_name,
  u.avatar_url                                               as avatar_url,
  coalesce(sum(s.strokes), 0)::int                           as total_strokes,
  count(s.id)::int                                           as holes_played,
  coalesce(sum(s.strokes - h.par), 0)::int                   as relative_to_par
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.users u         on u.id = gp.user_id
left join public.scores s   on s.game_player_id = gp.id
left join public.holes  h   on h.id = s.hole_id
group by g.id, gp.id, u.id;

grant select on public.game_leaderboard to authenticated;

-- ============================================================
-- View: public_users (search / invite directory)
--   Intentionally runs as the view owner (default security_invoker = off) so
--   it bypasses RLS on public.users. Exposes ONLY non-PII columns, making it
--   safe for full-table ILIKE search by any authenticated user without
--   leaking emails.
-- ============================================================
drop view if exists public.public_users;
create view public.public_users as
  select id, full_name, username, avatar_url
  from public.users;

grant select on public.public_users to authenticated;

-- ============================================================
-- Helper: whether two users are in a 'accepted' friendship relationship
-- ============================================================
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ============================================================
-- Helper: minimal game info for invite links. RLS on `games` would block a
-- non-participant from reading the row at all, so this security-definer
-- function exposes only the fields we'd put on a join screen.
-- ============================================================
create or replace function public.get_game_invite_info(p_game_id uuid)
returns table(
  game_id uuid,
  name text,
  status game_status,
  host_full_name text,
  host_username text,
  course_name text,
  course_city text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.status,
    u.full_name,
    u.username::text,
    c.name,
    c.city
  from public.games g
  left join public.users u   on u.id = g.host_id
  left join public.courses c on c.id = g.course_id
  where g.id = p_game_id;
$$;

-- Granted to anon as well so the OG image generator (which has no user
-- session) can fetch basic game info when rendering link previews. Keys are
-- UUIDs and the columns returned are non-PII (host name, course name).
grant execute on function public.get_game_invite_info(uuid) to authenticated, anon;

-- ============================================================
-- Helper: append the calling user to a game's player list. Used by the
-- shareable invite link flow — the client RPCs this instead of inserting
-- directly so we can compute the next free position without forcing the
-- caller to read game_players (which they cannot under RLS until they join).
-- ============================================================
create or replace function public.join_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status game_status;
  v_position int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth' using errcode = 'P0001';
  end if;

  select status into v_status from public.games where id = p_game_id;
  if v_status is null then
    raise exception 'game_not_found' using errcode = 'P0001';
  end if;
  if v_status = 'cancelled' then
    raise exception 'cancelled' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.game_players
    where game_id = p_game_id and user_id = v_user_id
  ) then
    return;
  end if;

  select coalesce(max(position), 0) + 1 into v_position
  from public.game_players where game_id = p_game_id;

  insert into public.game_players (game_id, user_id, position)
  values (p_game_id, v_user_id, v_position);
end;
$$;

grant execute on function public.join_game(uuid) to authenticated;

create or replace function public.create_game(
  p_course_id uuid,
  p_name text default null,
  p_player_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_game_id uuid;
  v_hole_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth' using errcode = 'P0001';
  end if;

  perform public.ensure_user_profile();

  select hole_count into v_hole_count
  from public.courses
  where id = p_course_id;

  if v_hole_count is null then
    raise exception 'course_missing' using errcode = 'P0001';
  end if;
  if v_hole_count < 1 then
    raise exception 'no_holes' using errcode = 'P0001';
  end if;

  insert into public.games (course_id, host_id, name, status, started_at)
  values (p_course_id, v_user_id, nullif(btrim(p_name), ''), 'in_progress', now())
  returning id into v_game_id;

  insert into public.game_players (game_id, user_id, position)
  select v_game_id, player_id, row_number() over (order by first_position)
  from (
    select player_id, min(position) as first_position
    from unnest(array_prepend(v_user_id, coalesce(p_player_ids, '{}')))
      with ordinality as players(player_id, position)
    group by player_id
  ) players;

  return v_game_id;
end;
$$;

grant execute on function public.create_game(uuid, text, uuid[]) to authenticated;

-- ============================================================
-- Helper: top players for a given course (security definer so any
-- authenticated user can view the public per-course leaderboard, not just
-- those who happen to share game history with the course's regulars).
-- Returns only non-PII columns.
-- ============================================================
create or replace function public.get_course_leaderboard(
  p_course_id uuid,
  p_limit int default 10
)
returns table(
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  rounds int,
  best_relative int,
  avg_relative numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with round_scores as (
    select
      gp.user_id,
      gp.id as game_player_id,
      sum(s.strokes - h.par)::int as relative_to_par
    from public.games g
    join public.game_players gp on gp.game_id = g.id
    join public.scores s on s.game_player_id = gp.id
    join public.holes h on h.id = s.hole_id
    where g.course_id = p_course_id
      and g.status = 'finished'
    group by gp.user_id, gp.id
    having count(s.id) > 0
  )
  select
    rs.user_id,
    coalesce(u.full_name, u.username::text)              as display_name,
    u.username::text                                     as username,
    u.avatar_url                                         as avatar_url,
    count(*)::int                                        as rounds,
    min(rs.relative_to_par)                              as best_relative,
    round(avg(rs.relative_to_par)::numeric, 1)           as avg_relative
  from round_scores rs
  join public.users u on u.id = rs.user_id
  group by rs.user_id, u.full_name, u.username, u.avatar_url
  order by avg_relative asc, rounds desc
  limit p_limit;
$$;

grant execute on function public.get_course_leaderboard(uuid, int) to authenticated;

-- ============================================================
-- Helper: self-service account deletion. Cascades through users → games
-- (when host) → game_players + scores, plus friendships. We can't expose
-- auth.users.delete to clients, so a security-definer function gates it.
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth' using errcode = 'P0001';
  end if;

  -- auth.users delete cascades to public.users via the FK, which then
  -- cascades through the rest of the schema.
  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- Storage: avatars bucket — public read, owner-only write. The folder
-- prefix in the object name MUST match auth.uid() so users can't overwrite
-- each other's files.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB cap matches client-side validation
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Helper: whether the current user is in the game
-- ============================================================
create or replace function public.is_game_participant(p_game_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games g
    where g.id = p_game_id
      and (
        g.host_id = p_user_id
        or exists (
          select 1 from public.game_players gp
          where gp.game_id = g.id and gp.user_id = p_user_id
        )
      )
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users        enable row level security;
alter table public.friendships  enable row level security;
alter table public.courses      enable row level security;
alter table public.holes        enable row level security;
alter table public.games        enable row level security;
alter table public.game_players enable row level security;
alter table public.scores       enable row level security;

-- USERS: limited visibility — self, friends (pending or accepted), and
-- game co-participants. For broad search use the public.public_users view,
-- which exposes only non-PII columns.
drop policy if exists users_select_authenticated on public.users;
drop policy if exists users_select_self_or_relation on public.users;
create policy users_select_self_or_relation
  on public.users for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships f
      where f.status in ('accepted', 'pending')
        and (
          (f.requester_id = auth.uid() and f.addressee_id = users.id)
          or (f.addressee_id = auth.uid() and f.requester_id = users.id)
        )
    )
    or exists (
      select 1
      from public.game_players me
      join public.game_players them on me.game_id = them.game_id
      where me.user_id = auth.uid() and them.user_id = users.id
    )
  );

drop policy if exists users_update_self on public.users;
create policy users_update_self
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- FRIENDSHIPS: you only see your own, you only create as requester.
drop policy if exists friendships_select_own on public.friendships;
create policy friendships_select_own
  on public.friendships for select
  to authenticated
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists friendships_insert_self on public.friendships;
create policy friendships_insert_self
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists friendships_update_participant on public.friendships;
create policy friendships_update_participant
  on public.friendships for update
  to authenticated
  using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));

drop policy if exists friendships_delete_participant on public.friendships;
create policy friendships_delete_participant
  on public.friendships for delete
  to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- COURSES + HOLES: public catalog for reading, editing only by service_role
-- (for now we seed courses manually; in the future we can add the 'curator' role
-- and separate policies).
drop policy if exists courses_select_all on public.courses;
create policy courses_select_all
  on public.courses for select
  to authenticated, anon
  using (true);

drop policy if exists holes_select_all on public.holes;
create policy holes_select_all
  on public.holes for select
  to authenticated, anon
  using (true);

-- GAMES: host and players see; host creates; host modifies.
drop policy if exists games_select_participant on public.games;
create policy games_select_participant
  on public.games for select
  to authenticated
  using (public.is_game_participant(id, auth.uid()));

drop policy if exists games_insert_host on public.games;
create policy games_insert_host
  on public.games for insert
  to authenticated
  with check (auth.uid() = host_id);

drop policy if exists games_update_host on public.games;
create policy games_update_host
  on public.games for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

drop policy if exists games_delete_host on public.games;
create policy games_delete_host
  on public.games for delete
  to authenticated
  using (auth.uid() = host_id);

-- GAME_PLAYERS: game participants see; host can add anyone or player can add themselves
-- (after accepting an invitation – in MVP the host manually adds friends).
drop policy if exists game_players_select on public.game_players;
create policy game_players_select
  on public.game_players for select
  to authenticated
  using (public.is_game_participant(game_id, auth.uid()));

drop policy if exists game_players_insert on public.game_players;
create policy game_players_insert
  on public.game_players for insert
  to authenticated
  with check (
    -- host adds anyone to their game
    exists (select 1 from public.games g
            where g.id = game_id and g.host_id = auth.uid())
    -- or player adds themselves
    or auth.uid() = user_id
  );

drop policy if exists game_players_update_self_or_host on public.game_players;
create policy game_players_update_self_or_host
  on public.game_players for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.games g
               where g.id = game_id and g.host_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from public.games g
               where g.id = game_id and g.host_id = auth.uid())
  );

drop policy if exists game_players_delete_self_or_host on public.game_players;
create policy game_players_delete_self_or_host
  on public.game_players for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.games g
               where g.id = game_id and g.host_id = auth.uid())
  );

-- SCORES: player edits their own row, host can edit anyone's;
-- all participants read.
drop policy if exists scores_select_participant on public.scores;
create policy scores_select_participant
  on public.scores for select
  to authenticated
  using (public.is_game_participant(game_id, auth.uid()));

drop policy if exists scores_insert_self_or_host on public.scores;
create policy scores_insert_self_or_host
  on public.scores for insert
  to authenticated
  with check (
    exists (
      select 1 from public.game_players gp
      where gp.id = game_player_id and gp.game_id = scores.game_id
        and (gp.user_id = auth.uid()
             or exists (select 1 from public.games g
                        where g.id = scores.game_id and g.host_id = auth.uid()))
    )
  );

drop policy if exists scores_update_self_or_host on public.scores;
create policy scores_update_self_or_host
  on public.scores for update
  to authenticated
  using (
    exists (
      select 1 from public.game_players gp
      where gp.id = game_player_id
        and (gp.user_id = auth.uid()
             or exists (select 1 from public.games g
                        where g.id = gp.game_id and g.host_id = auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.game_players gp
      where gp.id = game_player_id
        and (gp.user_id = auth.uid()
             or exists (select 1 from public.games g
                        where g.id = gp.game_id and g.host_id = auth.uid()))
    )
  );

drop policy if exists scores_delete_self_or_host on public.scores;
create policy scores_delete_self_or_host
  on public.scores for delete
  to authenticated
  using (
    exists (
      select 1 from public.game_players gp
      where gp.id = game_player_id
        and (gp.user_id = auth.uid()
             or exists (select 1 from public.games g
                        where g.id = gp.game_id and g.host_id = auth.uid()))
    )
  );

-- ============================================================
-- Realtime publication (Supabase listens to supabase_realtime)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.games;

-- REPLICA IDENTITY FULL — allows Realtime to send UPDATE/DELETE
-- when filtering by columns other than primary key (e.g. game_id).
alter table public.scores       replica identity full;
alter table public.game_players replica identity full;
alter table public.games        replica identity full;

-- ============================================================
-- Grants
-- ============================================================
-- RLS policies decide which rows are visible/editable, but the roles still
-- need table privileges before PostgreSQL can evaluate those policies.
grant usage on schema public to anon, authenticated;

grant select on public.courses, public.holes to anon, authenticated;
grant select on public.users, public.public_users, public.game_leaderboard to authenticated;
grant update on public.users to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.game_players to authenticated;
grant select, insert, update, delete on public.scores to authenticated;

grant execute on function public.ensure_user_profile() to authenticated;
grant execute on function public.create_game(uuid, text, uuid[]) to authenticated;

-- ============================================================
-- Seed: initial course catalog
-- ============================================================
with course as (
  insert into public.courses (
    name,
    slug,
    city,
    region,
    country,
    latitude,
    longitude,
    description
  )
  values (
    'Lotników DiscGolfPark',
    'lotnikow-discgolfpark',
    'Kraków',
    'Małopolskie',
    'PL',
    50.0695334,
    19.9932785,
    '9 holes. Concrete tees. DiscGolfPark Pro Target targets. Mixed use public park. Dogs allowed. Cart friendly. Drinking water available from park fountains. No restroom available. Not stroller friendly. Limited mobility/cane accessible. Some elevation change and rough terrain in parts of the park. Established in 2025.'
  )
  on conflict (slug) do update
    set name = excluded.name,
        city = excluded.city,
        region = excluded.region,
        country = excluded.country,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        description = excluded.description,
        updated_at = now()
  returning id
)
insert into public.holes (course_id, number, par)
select course.id, hole_number, 3
from course
cross join generate_series(1, 9) as hole_number
on conflict (course_id, number) do update
  set par = excluded.par;
