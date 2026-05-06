# Disc Golf Tracker

An application for tracking disc golf rounds in Poland — live scorecard, leaderboards
with friends, and statistics history.

**Stack:** Next.js 16 (App Router, TS), Supabase (Auth + Postgres + Realtime),
Tailwind CSS 4, shadcn/ui, deployed on Vercel.

---

## Quick Start

### 1. Clone and install dependencies

```bash
npm install
copy .env.example .env.local
```

### 2. Set up Supabase project and configure variables

1. Go to https://supabase.com → **New project**.
2. After creation, copy from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `publishable` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Paste them into `.env.local`.
4. Set `NEXT_PUBLIC_SITE_URL`:
   - locally: `http://localhost:3000`
   - in production: your domain address on Vercel

### 3. Push schema and initial data to the database

**Option A – Supabase CLI (recommended):**

```bash
npm i -g supabase
supabase link --project-ref <PROJECT_REF>
supabase db push          # remote: pushes migrations from supabase/migrations
supabase db reset         # local: resets from migrations
```

**Option B – SQL Editor in the dashboard:**
Paste the contents of `supabase/migrations/20260505000000_init.sql`.

### 4. Configure Google OAuth in Google Cloud and Supabase

1. **Google Cloud Console** → APIs & Services → Credentials → **Create OAuth client ID**
   - Application type: _Web application_
   - Authorized redirect URI:
     `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. Copy `Client ID` + `Client secret`.
3. **Supabase dashboard** → Authentication → Providers → Google:
   - Enable and paste Client ID + Secret.
4. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000` (dev) or your domain (prod)
   - Redirect URLs: add `http://localhost:3000/auth/callback`
     and production `https://<domain>/auth/callback`.

### 5. Run the application locally

```bash
npm run dev
```

The application starts at http://localhost:3000.

### 6. (Optional) Generate types from database after migrations

```bash
supabase gen types typescript --project-id <PROJECT_REF> --schema public \
  > src/types/database.ts
```

### Local workflow in practice

1. Edit your code.
2. Change the schema or initial data in `supabase/migrations/20260505000000_init.sql`.
3. Run `supabase db push` or `supabase db reset`.
4. Run `npm run dev`.
5. Test Google login, game creation, scorecard, and realtime updates.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/         # Google login
│   ├── (app)/                # Protected layout (requires session)
│   │   ├── dashboard/
│   │   ├── courses/
│   │   ├── games/
│   │   ├── friends/
│   │   ├── stats/
│   │   └── profile/
│   ├── auth/
│   │   ├── callback/         # OAuth code exchange
│   │   └── sign-out/
│   ├── manifest.ts           # PWA manifest
│   ├── layout.tsx
│   └── page.tsx              # Landing page
├── components/
│   ├── auth/                 # LoginForm
│   ├── layout/               # AppShell, TopBar, MobileNav, UserMenu
│   └── ui/                   # shadcn/ui primitives
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # browser client
│   │   ├── server.ts         # server client (cookies)
│   │   └── middleware.ts     # session refresh helper
│   ├── site.ts               # config site URL, theme color
│   └── utils.ts              # cn()
├── proxy.ts                  # Next 16 "middleware" – auth gating
└── types/
    └── database.ts           # Supabase types

supabase/
├── migrations/
│   └── 20260505000000_init.sql
└── config.toml               # Supabase CLI
```

## Database Schema

- `users` – mirror of `auth.users` (trigger copies record on login).
- `friendships` – directional invitations with status (`pending`/`accepted`/`blocked`).
- `courses` + `holes` – publicly readable catalog. Development seed currently creates one course: Lotników DiscGolfPark in Kraków.
- `games` – host + game status.
- `game_players` – participants in a specific game.
- `scores` – player score on a hole (1–20 strokes).
- View `game_leaderboard` – aggregation per game (total, holes_played, relative_to_par).

All tables have **RLS**: players only see their games, host edits all,
players edit their own scores.

**Realtime** enabled for `scores`, `game_players`, `games` —
live scorecard works out of the box.

## Deploy on Vercel

1. Import repo at https://vercel.com/new.
2. In **Project Settings → Environment Variables** add for Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your production domain, e.g. `https://example.com`)
3. Push the database schema before first production login:

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

4. In Supabase add your production domain to:
   - **Auth → URL Configuration → Site URL**
   - **Auth → URL Configuration → Redirect URLs**
5. Ensure Google OAuth has redirect to Supabase:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
6. In Supabase verify Realtime publication includes `scores`, `game_players`, and `games`. The migration adds them to `supabase_realtime`; check Dashboard → Database → Publications if live updates do not work.
7. Deploy to Vercel.
8. After deployment, go to `/login` and test the full flow: Google login → dashboard → new game → invite second account → live scorecard → finish round → stats.

## Security Checklist Before Public Repo

- Keep `.env.local` private. `.gitignore` ignores `.env*` and only allows `.env.example`.
- Never commit Supabase service-role keys. The app uses only the publishable/anon key plus RLS and security-definer RPCs.
- Google OAuth client secret belongs in Supabase Dashboard or local Supabase CLI envs, not in Vercel client envs.
- Run `npm run lint` and `npm run build` before pushing.
- Confirm Supabase RLS is enabled by the migration and do not disable it in Dashboard.
- For production, use an HTTPS domain in `NEXT_PUBLIC_SITE_URL` and Supabase Auth redirect URLs.

## Scripts

```bash
npm run dev      # dev with Turbopack
npm run build    # production build
npm run start    # production server
npm run lint     # ESLint
```

## TODO (next steps)

- [x] New game wizard (select course → players → start)
- [x] Live scorecard with Supabase Realtime
- [x] Friend invitations list and acceptance
- [x] Stats page + leaderboard
- [x] Course seed and basic pairs
- [x] Service worker + offline fallback for PWA

### TODO (next iteration)

- [x] Naprawa błędów
- [x] Poprawienie `.gitignore`
- [x] Ogólna poprawka
- [x] Black theme
- [x] Lepszy UI
- [x] Lepsza czcionka
- [x] Używanie tylko komponentów shadcn
- [x] Dodanie komponentów Supabase UI: https://supabase.com/ui
- [x] Dodanie i18n

## Status

The MVP is complete: login, games, live scorecard, history, statistics, friends, and offline mode are available in the application. Remaining items are mainly further UX polish, richer public profiles, and possible course catalog extensions.
