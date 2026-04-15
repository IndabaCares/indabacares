# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

IndabaCares is a hotel-scoped employee recognition and engagement platform. It consists of three separate workspaces in one repo:

- **Mobile app** — React Native + Expo 54 + Expo Router (`app/`, `src/`)
- **Admin dashboard** — Next.js 16 App Router (`admin/`)
- **Backend** — Supabase (PostgreSQL + Edge Functions + Realtime) (`supabase/`)

---

## Commands

### Mobile (root)

```bash
npm install
npx expo start          # dev server (press i=iOS, a=Android)
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm test                # jest
npm run test:watch      # jest --watch
npx expo start -c       # clear Metro cache
```

Tests live in `src/__tests__/` and use `jest-expo`. Path alias `@/` maps to `src/`.

### Admin (`cd admin`)

```bash
npm install
npm run dev             # Next.js dev at http://localhost:3000
npm run build           # production build
npm run lint
```

### Backend

```bash
supabase start          # start local stack (Docker required)
supabase stop
supabase db reset       # wipe + re-run all migrations + seed.sql
supabase migration new <name>
supabase db push --linked       # apply migrations to remote
supabase functions serve        # serve all edge functions locally
supabase functions deploy --linked              # deploy all
supabase functions deploy <name> --linked       # deploy one
supabase functions logs <name> --linked         # stream logs
```

---

## Auth Architecture

This project uses a **custom employee auth system**, not Supabase Auth.

**Why:** Employees authenticate with an `employee_code` + password (not email). There are no Supabase Auth JWTs in the mobile flow.

**How it works:**

1. Employee logs in → `authenticate_employee` RPC returns a `session_token` (UUID) stored in `employee_active_sessions`.
2. Client persists the session to `expo-secure-store` via `EmployeeSessionManager` (`src/lib/EmployeeSessionManager.ts`).
3. Every Supabase request from the mobile app injects `x-session-token` as a custom header (see `src/lib/supabase.ts` — `hotelAwareFetch`).
4. PostgreSQL RLS reads this header via `current_employee_hotel()` to enforce hotel-level tenant isolation (migration 017).
5. Edge Functions validate the token via the `validate_session` RPC inside `withEmployeeAuth` middleware (`supabase/functions/_shared/auth-middleware.ts`).

**Admin dashboard** uses standard Supabase email/password Auth with the `@supabase/ssr` package (HTTP-only cookies). The admin client in `admin/src/lib/supabase/admin.ts` uses `service_role` and bypasses RLS — only use it in Server Components/Actions, never in client components.

**Provider chain** (`app/_layout.tsx`):
```
QueryProvider → EmployeeProvider → AuthProvider → RealtimeProvider → ToastProvider
```

`EmployeeProvider` owns the session state. `AuthProvider` wraps it and handles routing (unauthenticated → `/(auth)/employee-auth`, authenticated → `/(tabs)/`).

---

## Hotel-Level Tenant Isolation

All data is scoped to a `hotel` (string slug), not a `company_id`. Migration 017 established this model. Key PostgreSQL helpers:

- `current_employee_hotel()` — reads `x-session-token` from request headers, resolves to the employee's hotel slug
- `current_employee_id()` — same mechanism, returns the employee UUID
- RLS policies on every table use these functions

**Do not add direct `company_id` checks to new RLS policies** — use `hotel` via these helpers.

---

## Data Layer

**Mobile:** React Query hooks in `src/hooks/` wrap Supabase queries. Mutations that need business logic (balance checks, atomic updates) call Edge Functions. Direct PostgREST calls are used for reads and simple writes.

**State split:**
- Server state → React Query (`@tanstack/react-query`)
- Auth/session → `EmployeeContext` (React Context)
- UI-only state → Zustand (`src/stores/ui-store.ts`)

**Realtime:** `RealtimeProvider` (`src/providers/RealtimeProvider.tsx`) subscribes to Postgres changes for notifications, reactions, and chat. The `supabase_realtime` publication includes: `recognitions`, `reactions`, `comments`, `notifications`, `leaderboard_cache`.

---

## Edge Functions

All 17 functions live in `supabase/functions/`. Shared utilities are in `supabase/functions/_shared/`:

- `auth-middleware.ts` — `withEmployeeAuth()` wrapper (validates `x-session-token`)
- `supabase-client.ts` — `createAdminClient()` (service_role)
- Other shared: audit logging, notifications, CORS headers

Every new Edge Function should use `withEmployeeAuth` for authenticated routes or handle CORS OPTIONS manually for public routes. All DB writes use `adminClient` (service_role) — RLS is enforced at the DB layer, not the application layer.

---

## Database Migrations

77 sequential migrations in `supabase/migrations/`. Notable architectural migrations:

| Migration | What it does |
|-----------|-------------|
| 006 | RLS policies on all tables + Realtime publication |
| 008 | Atomic Postgres RPCs (recognition, redemption, refund, mood, leaderboard) |
| 017 | Hotel-level RLS isolation (replaces company_id-based isolation) |
| 032 | Rebuilt session architecture (`employee_active_sessions`) |
| 033 | Dynamic leaderboard (no more static cache) |

**Immutable tables** — `star_transactions`, `point_transactions`, and `audit_logs` have triggers preventing UPDATE/DELETE. Never attempt to modify these rows.

To add a migration: `supabase migration new <description>`, edit the generated file, then `supabase db push --linked`.

---

## UI Conventions

- **Mobile buttons:** Use `TouchableOpacity`, not `Pressable` — `Pressable` does not render `backgroundColor` on the target Android device.
- **Styling:** NativeWind (Tailwind for React Native) on mobile; Tailwind CSS v4 + shadcn/ui on admin.
- **Icons:** `@expo/vector-icons` on mobile; `lucide-react` on admin.
- **Forms (admin):** `react-hook-form` + `zod` for validation.
- **Tables (admin):** `@tanstack/react-table`.
- **Charts (admin):** `recharts`.
- **Toasts (admin):** `sonner`.

---

## Environment Variables

**Mobile (`.env`):**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

**Admin (`admin/.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # required for admin client (Server Components only)
```

Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically from the Supabase project.

---

## Scheduled Jobs (pg_cron)

Three cron jobs must be configured manually after migrations (see README §1):

- `refresh-leaderboard` — daily at 02:00 UTC
- `reset-budgets` — 1st of month at 00:05 UTC
- `cleanup-rate-limits` — hourly

---

## Rate Limiting

Application-level rate limiting uses the `auth_rate_limits` table + `check_rate_limit()` function (migration 007). Edge Functions enforce per-operation limits (e.g., 5 recognitions/day, 5 redemptions/hour). Do not bypass these checks in new Edge Functions.
