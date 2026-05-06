-- Security hardening (security review 2026-05-06)
--
-- 1. Stop leaking public.users (incl. email) to people who only RECEIVED a
--    friend invite or who are still in the 'pending' phase. Previous policy
--    let either party read the full row as soon as a friendship row existed
--    in any state — so a stranger could enumerate emails by sending
--    invites. Tighten to 'accepted' only.
--
--    Self-visibility and co-game-player visibility are kept (the latter is
--    a deliberate trade-off: people sharing a scorecard can already see
--    each other's names; reducing it further would require a redesign of
--    the player picker and scorecard).

drop policy if exists users_select_self_or_relation on public.users;
create policy users_select_self_or_relation
  on public.users for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
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
