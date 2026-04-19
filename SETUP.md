# Atyant Ops Backend — Setup

NestJS · Drizzle ORM · PostgreSQL (Supabase) · JWT

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL + JWT_SECRET
pnpm run start:dev     # → http://localhost:4000
# Swagger → http://localhost:4000/api/docs
```

## Database setup (first time only)

1. Go to Supabase Dashboard → SQL Editor
2. Run `drizzle/migrations/0001_init.sql`
3. Run `drizzle/migrations/0002_tasks.sql`

## Create first admin

```bash
node -e "const b = require('bcryptjs'); b.hash('Admin@123', 12).then(h => console.log(h))"
```

Paste hash into Supabase SQL Editor:
```sql
INSERT INTO users (name, email, password_hash, role, status, joined_at)
VALUES ('Your Name', 'you@atyant.in', 'PASTE_HASH', 'super_admin', 'active', now());
```

Login at frontend: `http://localhost:3000/login`

## API endpoints (all at /api/v1)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login → returns token + user |
| GET | `/auth/me` | Get current user (from cookie/token) |
| POST | `/auth/accept-invite` | Accept invite + set password |
| GET | `/dashboard` | Stats for frontend dashboard page |
| GET | `/mentors` | List mentors (filter: stage, domain, search) |
| POST | `/mentors` | Create mentor |
| PATCH | `/mentors/:id` | Update mentor |
| PATCH | `/mentors/:id/stage` | Move pipeline stage |
| PATCH | `/mentors/:id/assign` | Assign to team member |
| POST | `/mentors/:id/notes` | Add note |
| GET | `/students` | List students |
| POST | `/students` | Create student |
| PATCH | `/students/:id/stage` | Move pipeline stage |
| GET | `/sessions` | List sessions |
| POST | `/sessions` | Book session |
| PATCH | `/sessions/:id` | Update session |
| GET | `/tasks` | List all tasks |
| GET | `/tasks/my` | My tasks |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task (status, priority etc.) |
| DELETE | `/tasks/:id` | Delete task |
| GET | `/users` | List team members |
| POST | `/users/invite` | Send invite email |
| PATCH | `/users/:id/deactivate` | Deactivate member |
| PATCH | `/users/:id/reactivate` | Reactivate member |
| GET | `/notifications` | Get notifications (isRead, limit query params) |
| PATCH | `/notifications/:id/read` | Mark read |
| PATCH | `/notifications/read-all` | Mark all read |

## Field mapping (frontend → backend schema)

| Frontend sends | DB column |
|---|---|
| `name` | `full_name` |
| `company` | `current_company` |
| `linkedin` | `linkedin_url` |
| `type` (session) | `session_type` |
| `dueAt` (task) | `due_date` |
| `body` (notification) | `message` |
