# ScriptArc

Welcome to **ScriptArc** — Level Up Your Coding!
A gamified, peer-based coding platform with leaderboards and a star rating system.

## 🛠 Tech Stack
- **Frontend** — React (CRA → migrating to Next.js)
- **Backend** — Supabase (Postgres) + Next.js API
- **Auth** — Supabase Auth (email + Google OAuth)
- **Code Execution** — Judge0 API

## 🚀 Features
- **Peer-to-Peer Learning:** Connect, code, and learn with peers.
- **Gamification:** Earn stars and climb the leaderboard as you improve your skills.
- **Interactive Environment:** Video lessons pause for hands-on coding challenges.
- **Mentor Tracking:** Teachers monitor progress and provide guidance.

## 📁 Folder Structure
```
ScriptArc/
├── frontend/          # React frontend (CRA with Craco)
├── backend/
│   ├── supabase/      # SQL migrations (schema, RLS, views)
│   └── nextjs/        # Next.js Supabase integration (auth, middleware)
├── design_guidelines.json
└── memory/            # PRD and project docs
```

## 🛠️ Setup
1. Create a [Supabase](https://supabase.com) project
2. Run the 3 SQL migration files in `backend/supabase/migrations/`
3. See `backend/SETUP.md` for full setup instructions

## 📜 License
© 2026 ScriptArc. All rights reserved.

## 👨‍💻 Author
**Aswin M**

---
*Built with ❤️ for passionate coders.*
