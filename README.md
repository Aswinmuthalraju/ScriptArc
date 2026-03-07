# ScriptArc

**Gamified coding education platform** — video lectures pause at specific timestamps for interactive MCQ and coding challenges, earning points toward skill certificates.

> Start. Solve. Succeed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (CRA + CRACO), Tailwind CSS, Radix UI, Framer Motion |
| Backend | Supabase (Postgres + Auth + RLS + Storage) |
| Video Streaming | Bunny Stream CDN (HLS adaptive via player.js iframe bridge) |
| Code Execution | Judge0 CE (general) + Custom Python Runner microservice (data science) |
| Certificates | html2pdf + QRCode.js + SHA-256 tamper detection |
| Package Manager | Yarn 1.x |

---

## Features

- **Checkpoint Challenges** — Video auto-pauses and locks at challenge timestamps; player controls blocked until challenge is completed
- **YouTube-style Playbar** — Seekable timeline with challenge markers, skip +10s / rewind -10s buttons
- **Points System** — MCQ: up to 2 pts, Coding: up to 4 pts; reduced for hints or solution views
- **Dual Code Engine** — Judge0 CE for general languages; isolated Python Runner for NumPy/Pandas data science challenges
- **Mentor System** — Mentors apply, admin approves; students link via `MNTR-XXXXXXXX` code; mentor dashboard with analytics, messages, and interventions
- **Certificates** — Auto-generated PDF with QR code on course completion; SHA-256 tamper detection on public verify page
- **Leaderboard** — Global ranking by total points, opt-in privacy mode
- **Lecture Lock** — Lessons unlock sequentially as each one is completed
- **Google OAuth** — Sign in with Google, role selection (Student / Mentor) at registration
- **Admin Panel** — Approve/reject mentor applications, manage all users and assignments
- **Dark/Light Mode** — Cyber-tech dark theme (default), toggleable to light

---

## Project Structure

```
ScriptArc_V1/
├── frontend/
│   ├── public/
│   │   └── certificate/             # Static certificate pages
│   │       ├── editor.html          # Renders certificate from URL params, generates PDF
│   │       ├── template.html        # Certificate visual template
│   │       └── style.css
│   └── src/
│       ├── App.js                   # Router + route guards (ProtectedRoute, MentorRoute, AdminRoute)
│       ├── pages/
│       │   ├── Landing.jsx          # Public marketing page
│       │   ├── Auth.jsx             # Login / register (email + Google OAuth)
│       │   ├── AuthCallback.jsx     # OAuth redirect handler
│       │   ├── Dashboard.jsx        # Student: progress, rank, recent activity
│       │   ├── Courses.jsx          # Course catalog
│       │   ├── CourseSingle.jsx     # Course detail, lecture list, mentor assignment, certificate download
│       │   ├── Learn.jsx            # Video player + MCQ/coding challenge dialogs
│       │   ├── Leaderboard.jsx      # Global leaderboard
│       │   ├── Profile.jsx          # Avatar picker, privacy settings
│       │   ├── MentorDashboard.jsx  # Analytics, student tracking, messages, interventions
│       │   ├── MentorPending.jsx    # Waiting room for pending mentor applications
│       │   ├── AdminPage.jsx        # Approve/reject mentors, manage users
│       │   └── VerifyCertificate.jsx # Public certificate verification with hash check
│       ├── components/
│       │   ├── Navbar.jsx           # Role-aware navigation
│       │   ├── ErrorBoundary.jsx
│       │   └── ui/                  # shadcn/ui-style Radix primitives + custom components
│       ├── context/
│       │   ├── AuthContext.jsx      # Supabase auth, user profile, mentor data
│       │   └── ThemeContext.jsx     # Dark/light mode
│       ├── hooks/
│       │   └── useHlsPlayer.js      # HLS.js hook for non-Bunny video (fallback)
│       └── lib/
│           ├── supabase.js          # Supabase client
│           ├── bunnyVideos.js       # order_index → Bunny Stream video ID map
│           └── constants.js         # ADMIN_EMAIL, LOCK_TOLERANCE_SECONDS, DATA_SCIENCE_COURSE_ID
├── backend/
│   ├── python-runner/               # FastAPI microservice for data science code execution
│   │   ├── server.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── supabase/
│       ├── functions/
│       │   └── execute-code/        # Edge Function: dual-engine code executor (Judge0 / Python Runner)
│       └── migrations/
│           └── V2/                  # Current schema — run in order
│               ├── 001_initial_schema.sql          # Core tables + indexes
│               ├── 002_rls_and_views.sql           # RLS, leaderboard view, triggers
│               ├── 003_seed_data.sql               # Data Science course (21 lessons, challenges for lectures 1-5)
│               ├── 004_performance_security.sql    # Performance indexes, security hardening
│               ├── 005_mentor_system.sql           # Mentor tables + RLS
│               ├── 006_security_fixes.sql          # Admin-only writes, unique submission constraint
│               ├── 007_certificates.sql            # Certificates table + generate_certificate() RPC
│               ├── 008_challenges_unit1_unit2.sql  # Additional challenge data
│               └── 009_student_mentor_assign.sql   # Student self-assignment RLS fix
├── design_guidelines.json           # Design system specification
└── CLAUDE.md                        # AI assistant instructions
```

---

## Getting Started

### Prerequisites
- Node.js 18+, Yarn 1.x
- Python 3.10+ (Python Runner without Docker)
- Docker (optional, recommended for Python Runner)
- Supabase project

### 1. Frontend

```bash
cd frontend
yarn install
yarn start           # http://localhost:3000
yarn build           # production build
```

**`frontend/.env` (required):**

```env
REACT_APP_SUPABASE_URL=https://<your-project>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
```

### 2. Database

Run all migrations in order in the Supabase SQL Editor:

```
V2/001_initial_schema.sql
V2/002_rls_and_views.sql
V2/003_seed_data.sql
V2/004_performance_security.sql
V2/005_mentor_system.sql
V2/006_security_fixes.sql
V2/007_certificates.sql
V2/008_challenges_unit1_unit2.sql
V2/009_student_mentor_assign.sql
```

All migrations are idempotent — safe to re-run.

### 3. Python Runner (data science challenges only)

**Docker (recommended):**
```bash
cd backend/python-runner
docker build -t scriptarc-python-runner .
docker run -p 8000:8000 scriptarc-python-runner
```

**Without Docker:**
```bash
cd backend/python-runner
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### 4. Edge Function

```bash
npx supabase functions deploy execute-code --no-verify-jwt
```

Set secrets in Supabase → Edge Functions → Secrets:
```
PYTHON_RUNNER_URL=https://your-python-runner-url
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

---

## Video Learning Flow

1. Student opens a lesson — Bunny Stream video loads via iframe
2. `player.js` bridges the iframe, exposing `play`, `pause`, `timeupdate`, `setCurrentTime` events
3. When `currentTime >= challenge.timestamp_seconds`, video **auto-pauses and locks**
4. A challenge dialog appears — a lock overlay blocks all native player controls
5. Student completes the challenge, earns points, video resumes from the challenge point
6. Player controls bar: seekable timeline with challenge markers, skip +10s, rewind -10s buttons

---

## Points System

| Challenge | Independent | Hint Used | Solution Viewed |
|---|---|---|---|
| MCQ | 2 pts | 1 pt (after 2 wrong attempts) | 0 pts |
| Coding | 4 pts | 2 pts | 0 pts |

- Points = platform progress metric (leaderboard, dashboard)
- Stars = certificate quality rating only

**Certificate Stars** (% of max possible points):
`90% → 5★` · `75% → 4★` · `60% → 3★` · `45% → 2★` · `<45% → 1★`

---

## Certificate Flow

1. Student completes all lessons in a course
2. "Download Certificate" button appears on the course page
3. Frontend calls `supabase.rpc('generate_certificate', { p_course_id })`
4. DB function validates completion, computes score, generates `SCR-YYYY-NNNNNN` ID and SHA-256 hash
5. Opens `/certificate/editor.html` with certificate params — renders print-ready design
6. QR code links to `/verify/:certificateId` (public, no auth required)
7. Verify page re-derives the SHA-256 hash client-side and compares it to the stored value

---

## Role-Based Access

| Role | Pages |
|---|---|
| `student` | Dashboard, Courses, Learn, Leaderboard, Profile |
| `mentor` (pending) | Mentor Pending page only |
| `mentor` (approved) | Mentor Dashboard (own students only) |
| `admin` (by email) | Admin page — approve mentors, manage all users |

---

## Security

- Row Level Security on all tables
- `prevent_privilege_escalation` trigger — users cannot self-elevate `role`, `total_stars`, or `has_special_access`
- Certificate inserts only via `SECURITY DEFINER` RPC — no direct table writes allowed
- SHA-256 certificate hash enables client-side tamper detection on the verify page
- Unique `(user_id, challenge_id)` constraint prevents double-point submissions
- Video seek capped at the next uncompleted challenge timestamp (enforced per-tick via playerjs)
- Admin identified by JWT email claim only — no DB column to exploit

---

## Commands

```bash
# Frontend dev server
cd frontend && yarn start

# Frontend production build
cd frontend && yarn build

# Run tests
cd frontend && yarn test

# Python Runner (dev)
cd backend/python-runner && uvicorn server:app --reload --port 8000
```

---

## Deployment Checklist

- [ ] Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in hosting platform
- [ ] Run all V2 migrations (001–009) on production Supabase project
- [ ] Deploy `execute-code` Edge Function and set `PYTHON_RUNNER_URL` + `ALLOWED_ORIGINS` secrets
- [ ] Deploy Python Runner and expose via public HTTPS URL
- [ ] Enable Google OAuth in Supabase Auth → Providers → Google
- [ ] Verify Bunny Stream library ID (`612832`) and video IDs match `bunnyVideos.js`
- [ ] Confirm RLS policies are active on all tables
- [ ] Test full student flow: login → watch → challenge → certificate → verify
- [ ] Test mentor flow: apply → admin approve → get code → student assigns

---

## Data Science Course

- Course ID: `d5c1e7a3-9f2b-4e8d-a6c4-3b7f1e9d2a5c`
- 21 lessons — Unit 1 (order_index 1–11), Unit 2 (12–21)
- Challenges seeded for lectures 1–5 (migration 008 extends to remaining lectures)
- Routes to Python Runner for NumPy/Pandas execution instead of Judge0
- 10s execution timeout, 50KB output cap, dangerous operations blocked

---

## Author

**Aswin M** · © 2026 ScriptArc · All rights reserved.
