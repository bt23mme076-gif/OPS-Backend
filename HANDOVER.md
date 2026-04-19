# Atyant Ops — Complete Handover Guide
**Version:** 2.0 | **Prepared by:** Nitin Rai | **Date:** April 2026

---

## 1. What This System Is

Atyant Ops is an internal CRM and operations platform for managing Atyant's mentors, students, sessions, tasks, and team. It is **not** the student-facing atyant.in website. It is an internal tool used only by the Atyant ops team.

**Access:** Invite-only. No public registration.
**URL (production):** Set up on Vercel (frontend) + Managed KVM (backend)
**URL (local dev):** Frontend → http://localhost:3000 | Backend → http://localhost:4000

---

## 2. System Architecture

```
atyant-ops-frontend/     → Next.js 14 (App Router) + TypeScript + Tailwind CSS
atyant-ops-backend/      → NestJS + TypeScript + Drizzle ORM
Database                 → PostgreSQL on Supabase
Auth                     → NextAuth (frontend) + JWT (backend)
Real-time                → Socket.io (in-app notifications)
Email                    → Nodemailer via Gmail SMTP (critical events only)
```

### How the two repos connect

The frontend calls the backend via REST API. Every request includes a JWT token in the `Authorization: Bearer <token>` header. The token is obtained on login and stored in the NextAuth session for 7 days.

```
Browser → Next.js (port 3000) → NestJS API (port 4000) → Supabase PostgreSQL
```

---

## 3. Repository Structure

### Backend (`atyant-ops-backend/`)

```
src/
├── app.module.ts              ← Root module — imports all modules
├── main.ts                    ← Entry point — port, CORS, Swagger
├── auth/                      ← Login + invite accept + JWT strategy
├── users/                     ← Team management — invite, deactivate, permissions
├── mentors/                   ← Mentor CRUD + stage + activity log
├── students/                  ← Student CRUD + stage + activity log
├── sessions/                  ← Session booking + updates
├── tasks/                     ← Task management (Kanban)
├── roles/                     ← Marketplace role postings
├── notifications/             ← In-app notifications + Socket.io gateway
├── dashboard/                 ← OMTM metrics aggregation
├── mail/                      ← Nodemailer email service
├── database/                  ← Drizzle + postgres connection
└── common/                    ← Guards (JWT, Roles) + decorators

drizzle/
├── schema.ts                  ← All database table definitions
├── migrations/
│   ├── 0001_init.sql          ← Initial schema (run in Supabase SQL Editor)
│   └── 0002_tasks.sql         ← Tasks table (run after 0001)
└── migrations/meta/
    └── _journal.json          ← Drizzle migration tracking

scripts/
└── patch-drizzle.js           ← Auto-patches drizzle-kit Supabase FK bug
```

### Frontend (`atyant-ops-frontend/`)

```
src/
├── app/
│   ├── (app)/                 ← All authenticated pages (share sidebar layout)
│   │   ├── layout.tsx         ← Sidebar + TopBar wrapper (auth guard here)
│   │   ├── dashboard/         ← OMTM metrics + pipeline overview
│   │   ├── pipeline/          ← Kanban board (mentors + students)
│   │   ├── mentors/           ← Mentor list + drawer + add modal
│   │   ├── students/          ← Student list + drawer + add modal
│   │   ├── sessions/          ← Session list + book + update modals
│   │   ├── tasks/             ← Task Kanban (To Do / In Progress / Done)
│   │   ├── team/              ← Invite + deactivate + permissions
│   │   └── settings/          ← Profile view
│   ├── auth/
│   │   ├── login/             ← Login page
│   │   └── invite/            ← Accept invite page (token-based)
│   └── api/auth/[...nextauth] ← NextAuth route handler
├── components/
│   ├── layout/                ← Sidebar, TopBar, Providers
│   ├── cards/                 ← MentorDrawer, StudentDrawer, ActivityLog
│   ├── pipeline/              ← PipelineBoard (Kanban)
│   ├── notifications/         ← NotificationsPanel
│   └── ui/                    ← Badge, Avatar, Modal, Select, Spinner, etc.
├── hooks/
│   └── useSocket.ts           ← Socket.io real-time hook
├── lib/
│   ├── api.ts                 ← All API client functions (axios)
│   ├── utils.ts               ← cn(), timeAgo(), stage labels, formatters
│   └── store.ts               ← Zustand auth store
└── types/
    ├── index.ts               ← All TypeScript interfaces
    └── next-auth.d.ts         ← NextAuth type augmentation
```

---

## 4. Environment Variables

### Backend (`.env`)

```env
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET=minimum-32-character-random-string
PORT=4000
FRONTEND_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ops@atyant.in
SMTP_PASS=16-char-gmail-app-password
MAIL_FROM=ops@atyant.in
```

### Frontend (`.env.local`)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=minimum-32-character-random-string
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → Create. Use this 16-char password, NOT your Gmail password.

**Supabase URL:** Supabase Dashboard → Settings → Database → Connection String → Session pooler (port 5432).

---

## 5. First-Time Setup (New Developer)

### Step 1 — Clone repos
```bash
git clone <repo-url>/atyant-ops-backend
git clone <repo-url>/atyant-ops-frontend
```

### Step 2 — Backend setup
```bash
cd atyant-ops-backend
cp .env.example .env
# Fill in all .env values

pnpm install
# This auto-patches the drizzle-kit Supabase bug via postinstall script
```

### Step 3 — Database setup (Supabase)
Go to **Supabase Dashboard → SQL Editor → New Query**

Run `drizzle/migrations/0001_init.sql` → Click Run
Then run `drizzle/migrations/0002_tasks.sql` → Click Run

### Step 4 — Create first Super Admin
```bash
node -e "const b = require('bcryptjs'); b.hash('Admin@123', 12).then(h => console.log(h))"
```

Copy the hash. Then in Supabase SQL Editor:
```sql
INSERT INTO users (name, email, password_hash, role, status, joined_at)
VALUES ('Nitin Rai', 'nitin@atyant.in', 'PASTE_HASH_HERE', 'super_admin', 'active', now());
```

### Step 5 — Start backend
```bash
pnpm run start:dev
# Runs on http://localhost:4000
# Swagger docs at http://localhost:4000/api/docs
```

### Step 6 — Frontend setup
```bash
cd atyant-ops-frontend
cp .env.example .env.local
# Fill in all .env.local values

pnpm install
pnpm run dev
# Runs on http://localhost:3000
```

### Step 7 — Login
Go to http://localhost:3000
Email: nitin@atyant.in | Password: Admin@123

---

## 6. User Roles & Permissions

| Role | What they can do |
|---|---|
| `super_admin` | Everything. Cannot be deactivated. |
| `admin` | Everything except managing other admins. |
| `sales` | Mentor + Student pipeline cards assigned to them. |
| `content` | AnswerCards, success stories, content tasks. |
| `outreach` | Mentor recruitment, student outreach tasks. |
| `viewer` | Read-only across all modules. |

**Permission rules:**
- Every team member can **see** every card.
- Team members can only **edit** cards they created or are assigned to.
- Admins and Super Admins can edit everything.
- Custom per-module read/write permissions can be set per user in Team → Permissions.

**Invite flow:**
1. Team page → Invite Member → Enter email + select role → Send
2. Invitee receives email with link (valid 7 days)
3. They click the link → set name + password → account created
4. Login with those credentials

---

## 7. Key Workflows

### Adding a Mentor
- Mentors page → Add Mentor (top right) OR
- Pipeline page → Mentors tab → click `+` on any stage column
- Fill name, email, LinkedIn, company, domain, source
- Mentor starts in `Identified` stage

### Moving a Mentor through the Pipeline
- Pipeline page → drag card to next column OR
- Open mentor drawer → click stage badge directly

### Booking a Session
- Sessions page → Book Session button
- Select student + mentor + type + format + date/time
- Add Google Meet link manually
- After session: click Update → set status to Completed → fill rating

### Creating a Task
- Tasks page → New Task (top right) OR click `+` on any column
- Assign to team member, link to mentor/student if relevant
- Drag between columns to update status

### Inviting a Team Member
- Team page → Invite Member
- Email is sent (uses Gmail SMTP — counts toward 500/month limit)
- Only invite emails, deactivation emails, assignment emails, and placement emails are sent

### Schema Changes (future)
1. Edit `drizzle/schema.ts`
2. Run `pnpm run db:generate` → creates new SQL file in `drizzle/migrations/`
3. Open that SQL file → paste into Supabase SQL Editor → Run
4. **Never use `pnpm run db:push`** — it crashes on Supabase due to FK introspection bug

---

## 8. API Reference

All endpoints are documented at `http://localhost:4000/api/docs` (Swagger UI).

Base URL: `http://localhost:4000/api/v1`

All endpoints except `/auth/login` and `/auth/accept-invite` require:
```
Authorization: Bearer <jwt_token>
```

### Key endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/auth/login` | Login → returns JWT + user |
| POST | `/auth/accept-invite` | Accept invite + set password |
| GET | `/mentors` | List mentors (filter: stage, domain, search) |
| POST | `/mentors` | Create mentor |
| PATCH | `/mentors/:id/stage` | Update pipeline stage |
| PATCH | `/mentors/:id/assign` | Assign to team member |
| POST | `/mentors/:id/notes` | Add note |
| GET | `/students` | List students |
| POST | `/students` | Create student |
| PATCH | `/students/:id/stage` | Update pipeline stage |
| GET | `/sessions` | List sessions |
| POST | `/sessions` | Book session |
| GET | `/tasks` | List all tasks |
| GET | `/tasks/my` | My assigned tasks |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| POST | `/users/invite` | Send invite email |
| PATCH | `/users/:id/deactivate` | Deactivate user |
| PATCH | `/users/:id/permissions` | Update module permissions |
| GET | `/dashboard/omtm` | All OMTM metrics |

---

## 9. Database Schema (15 tables)

| Table | Purpose |
|---|---|
| `users` | Team members — ops team only |
| `user_permissions` | Per-module read/write flags per user |
| `invites` | Pending invite tokens |
| `mentors` | All mentor data + pipeline stage |
| `students` | All student data + pipeline stage |
| `pipeline_activities` | Full activity log per mentor/student card |
| `sessions` | Mentor-student sessions |
| `roles_posted` | Job/internship postings by mentors |
| `applications` | Student applications to roles |
| `rejection_tags` | 1-click rejection categorization |
| `rejection_roadmaps` | AI-generated roadmaps from rejection tags |
| `answer_cards` | Structured output from sessions |
| `tasks` | Internal team task management |
| `notifications` | In-app notification queue |

---

## 10. Deployment

### Frontend (Vercel)

1. Push `atyant-ops-frontend` to GitHub
2. Import repo in Vercel → it auto-detects Next.js
3. Add all env variables from `.env.local` in Vercel Dashboard → Settings → Environment Variables
4. Change `NEXTAUTH_URL` to your production domain
5. Change `NEXT_PUBLIC_API_URL` to your backend's production URL

### Backend (Managed KVM)

```bash
# On the server
git clone <repo> atyant-ops-backend
cd atyant-ops-backend
cp .env.example .env
# Fill .env with production values

pnpm install
pnpm run build

# Run with PM2
npm install -g pm2
pm2 start dist/main.js --name atyant-ops-backend
pm2 save
pm2 startup
```

Set up Nginx reverse proxy to forward port 80/443 → 4000.

**CORS:** In `.env`, set `FRONTEND_URL` to your Vercel production URL so the backend allows requests from it.

---

## 11. Common Issues & Fixes

| Issue | Fix |
|---|---|
| `db:push` crashes with FK error | Do not use `db:push`. Run SQL files in Supabase SQL Editor directly. |
| `new Date()` TypeError in backend | All `.set()` calls use `.toISOString()` — if you add new ones, always use `new Date().toISOString()` |
| `@radix-ui/react-badge` not found | Remove it from `package.json` — it does not exist on npm |
| Tailwind v4 PostCSS error | Pin `tailwindcss` to `^3.4.4` in `package.json` |
| `Linkedin` icon not in lucide-react | Use `ExternalLink` instead |
| NextAuth 405 on `/api/auth/session` | Route must export `GET` and `POST` named exports, not `export default` |
| Socket disconnects immediately | Check `JWT_SECRET` matches between `.env` and what was used to sign the token |
| Email failing with socket close | Use Gmail App Password (16-char), not regular Gmail password. Enable `requireTLS: true` |
| pnpm installing from Trash | `cd ~/Desktop/atyant-ops-frontend` before running pnpm |

---

## 12. What Is Not Built Yet

These are in the PRD but not implemented in Ops — document for future developer:

| Feature | PRD Reference | Notes |
|---|---|---|
| Rejection Intelligence UI | Layer 7 | Backend tables exist (`rejection_tags`, `rejection_roadmaps`). Need frontend workflow. |
| Answer Cards management | Layer 1 | Backend table exists. Need dedicated page in Ops. |
| Marketplace roles UI | Layer 5 | Backend (`roles_posted`, `applications`) exists. Need frontend page. |
| Blind referral queue | Layer 6 | Backend logic exists. Need frontend UI. |
| B2B company dashboard | Layer 3 (Revenue) | Not built. Phase 3. |
| AI Shadow Mentor | Phase 2 | Not built. Needs session data first. |
| Success story generator | Phase 2 | Not built. |
| 90-day outcome rating automation | Sessions | Field exists. Need scheduled reminder system. |
| Search across all entities | TopBar | Search input is placeholder only. |

---

## 13. Tech Decisions & Why

| Decision | Why |
|---|---|
| NestJS over Express | Structured modules, built-in DI, decorators — scales better as team grows |
| Drizzle over Prisma | Lighter, SQL-first, better TypeScript inference, faster |
| NextAuth | Handles JWT session persistence, CSRF, cookie management automatically |
| Supabase | Managed PostgreSQL with dashboard UI — no DevOps needed |
| React Query | Server state management — caching, refetching, invalidation out of the box |
| Zustand | Client state (auth store) — simpler than Redux for this use case |
| Tailwind v3 (not v4) | v4 breaks PostCSS plugin pattern — entire component system built on v3 utility classes |
| No `db:push` for Supabase | Drizzle-kit crashes on Supabase FK introspection in all versions tested |

---

*This document should be kept updated as the system evolves. Last updated: April 2026.*
