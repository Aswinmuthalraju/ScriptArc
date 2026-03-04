# ScriptArc — Supabase Backend Setup Guide

## Quick‑Start

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) → **New project**.
2. Save the **Project URL** and **anon public** key.

### 2. Configure Authentication Providers
| Provider | Where | Steps |
|----------|-------|-------|
| **Email** | Dashboard → Authentication → Providers → Email | Turn on **Email Sign‑Up** and **Email Login**. Optionally disable email confirmation for MVP. |
| **Google** (optional) | Dashboard → Authentication → Providers → Google | Paste your Google OAuth **Client ID** & **Secret**. Set redirect URL to `https://<project>.supabase.co/auth/v1/callback`. |

### 3. Run Migrations
In the Supabase **SQL Editor** (or local CLI), run these files **in order**:

```
backend/supabase/migrations/001_schema.sql        ← tables + trigger
backend/supabase/migrations/002_rls_policies.sql   ← RLS policies
backend/supabase/migrations/003_leaderboard_view.sql ← leaderboard + hints
```

### 4. Set Up Next.js Environment
1. Copy `backend/nextjs/.env.local.example` → `.env.local` in your Next.js root.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 5. Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 6. Copy Reference Code
Copy the files from `backend/nextjs/` into your Next.js project:

| Source | Destination |
|--------|-------------|
| `lib/supabase/client.js` | `lib/supabase/client.js` |
| `lib/supabase/server.js` | `lib/supabase/server.js` |
| `app/actions/auth.js` | `app/actions/auth.js` |
| `app/auth/callback/route.js` | `app/auth/callback/route.js` |
| `middleware.js` | `middleware.js` (project root) |

---

## Architecture Diagram

```
Frontend (Next.js App Router)
        │
        ▼
Supabase Auth (Email/Password + Google OAuth)
        │
        ▼
JWT Session (cookie‑based, auto‑refreshed by middleware)
        │
        ▼
PostgreSQL Database (Supabase)
        │
        ▼
Row Level Security (JWT‑powered access control)
```

---

## File Index

```
backend/
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql            ← Users, Courses, Challenges, Submissions
│       ├── 002_rls_policies.sql      ← All RLS policies
│       └── 003_leaderboard_view.sql  ← Leaderboard view + star calc function
├── nextjs/
│   ├── .env.local.example            ← Environment variable template
│   ├── middleware.js                  ← Auth + role middleware
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.js             ← Browser client
│   │       └── server.js             ← Server client
│   └── app/
│       ├── actions/
│       │   └── auth.js               ← signup / login / logout / Google
│       └── auth/
│           └── callback/
│               └── route.js          ← Google OAuth callback
└── SETUP.md                          ← This file

```

---

## Production Best Practices

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in any frontend or `NEXT_PUBLIC_` variable.
2. **RLS is the real guard** — the anon key is publicly visible; RLS is what protects data at the database level.
3. **Token refresh** is handled automatically inside `middleware.js` via `supabase.auth.getUser()`.
4. **Generate TypeScript types** for end‑to‑end safety:
   ```bash
   npx supabase gen types typescript --project-id "$PROJECT_ID" > types/supabase.ts
   ```
5. **Environment variables** — use `.env.local` in dev, Vercel environment settings in production.
6. **Disable email confirmation** in the Supabase dashboard for faster MVP iteration; re‑enable before launch.
