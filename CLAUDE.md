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
npm run test:coverage   # jest --coverage
npm test -- --testPathPattern=session-manager   # run a single test file
npx expo start -c       # clear Metro cache
```

Tests live in `src/__tests__/` (auth and features subdirs) and use `jest-expo`. Path alias `@/` maps to `src/`.

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

### EAS (mobile builds)

Three build profiles defined in `eas.json`:

```bash
eas build --profile development --platform android   # dev client (internal)
eas build --profile preview --platform android       # APK for QA
eas build --profile production --platform all        # production (autoIncrement)
eas update --channel production                      # OTA update via expo-updates
```

`appVersionSource: "remote"` — version is managed by EAS, not `app.json`.

---

## Auth Architecture

This project uses a **custom employee auth system**, not Supabase Auth.

**Why:** Employees authenticate with an `employee_code` + password (not email). There are no Supabase Auth JWTs in the mobile flow.

**How it works:**

1. Employee logs in → RPC returns a `session_token` (UUID) stored in `employee_active_sessions`:
   - First login: `first_time_authenticate` (migration 027) — atomic: identity + password hash + session in one transaction
   - Returning login: `authenticate_employee`
2. Client persists the session to `expo-secure-store` via `EmployeeSessionManager` (`src/lib/EmployeeSessionManager.ts`). Legacy AsyncStorage sessions are silently migrated to SecureStore on first load.
3. Every Supabase request from the mobile app passes through `src/lib/secureApi.ts` (domain allowlist + HTTPS enforcement + timeout + redirect guard) then injects `x-session-token` as a custom header (see `src/lib/supabase.ts` — `hotelAwareFetch`).
4. PostgreSQL RLS reads this header via `current_employee_hotel()` to enforce hotel-level tenant isolation (migration 017).
5. Edge Functions validate the token via the `validate_session` RPC inside `withEmployeeAuth` middleware (`supabase/functions/_shared/auth-middleware.ts`).

**Session boot sequence** (handled by `EmployeeProvider` on app start):
1. `loadSession()` — restore employee + token from SecureStore
2. `setSessionToken(token)` — inject header into Supabase client
3. `validateSessionWithDB()` — confirm employee still active in DB
4. If invalid → `clearSession()` — wipe SecureStore and header, route to login

**Admin dashboard** uses standard Supabase email/password Auth with the `@supabase/ssr` package (HTTP-only cookies). The admin client in `admin/src/lib/supabase/admin.ts` uses `service_role` and bypasses RLS — only use it in Server Components/Actions, never in client components.

**Provider chain** (`app/_layout.tsx`):
```
ErrorBoundary → QueryProvider → EmployeeProvider → AuthProvider → RealtimeProvider → ToastProvider
```

`EmployeeProvider` owns the session state. `AuthProvider` wraps it and handles routing (unauthenticated → `/(auth)/employee-auth`, authenticated → `/(tabs)/`).

---

## Hotel-Level Tenant Isolation

All data is scoped to a `hotel` (string slug), not a `company_id`. Migration 017 established this model. Key PostgreSQL helpers:

- `current_employee_hotel()` — reads `x-session-token` from request headers, resolves to the employee's hotel slug
- `current_employee_id()` — same mechanism, returns the employee UUID
- RLS policies on every table use these functions

**Do not add direct `company_id` checks to new RLS policies** — use `hotel` via these helpers.

The canonical hotel list lives in **three places** that must be kept in sync:
- `src/lib/hotels.ts` (mobile)
- `admin/src/lib/hotels.ts` (admin dashboard)
- `is_valid_hotel()` function in migration 017

**`APA_HOTEL` (`'African Procurement Agencies'`)** is a special-cased slug — migration 066 grants it cross-hotel read visibility. Treat it differently from regular hotels in any visibility or tenant logic.

---

## Mobile Screen Layout

Expo Router route groups:
- `app/(auth)/` — unauthenticated screens (employee login)
- `app/(onboarding)/` — first-time welcome flow (shown once via `hasSeenWelcome` flag, migration 075)
- `app/(tabs)/` — bottom-tab navigator (`index`, `give`, `leaderboard`, `rewards`, `profile`)
- `app/(screens)/` — full-screen push routes: flat screens (chat, campaigns, initiatives, mood, notifications, orders, settings, team, wallet, etc.) plus nested route dirs (`recognition/`, `reward/`, `user/`, `initiative/`, `skills/`, `team/`)

---

## Data Layer

**Mobile:** React Query hooks in `src/hooks/` are the consumption layer. The query/mutation logic lives one level below in `src/api/` — PostgREST wrappers in `queries.ts` and domain service files:

- `edge-functions.ts` — typed wrappers for all Edge Function calls
- `reward-service.ts`, `chat-service.ts`, `campaigns-service.ts`, `initiative-service.ts`
- `leaderboard-service.ts`, `legends-service.ts`, `notification-service.ts`
- `reaction-analytics-service.ts`, `team-service.ts`

Mutations that need business logic (balance checks, atomic updates) call Edge Functions via `src/api/edge-functions.ts`. Direct PostgREST calls are used for reads and simple writes.

All Supabase calls should be wrapped via `src/lib/api-client.ts` (`withTimeout` + exponential-backoff retry for transient network errors; default 10 s timeout).

React Query cache keys are centralised in `QUERY_KEYS` in `src/lib/constants.ts` — use these rather than inline string arrays in new hooks.

**State split:**
- Server state → React Query (`@tanstack/react-query`)
- Auth/session → `EmployeeContext` (React Context)
- UI-only state → Zustand (`src/stores/ui-store.ts`)

**Admin mutations** use Next.js Server Actions in `admin/src/app/actions/` (`employees.ts`, `rewards.ts`, `redemptions.ts`, `campaigns.ts`, `initiatives.ts`, `notifications.ts`). Server Components fetch data directly via `createAdminClient()`. Client components call Server Actions via `useTransition`.

**Admin routes** (`admin/src/app/`): `(dashboard)/` contains all authenticated admin pages (`analytics`, `audit-logs`, `campaigns`, `departments`, `employees`, `gamification`, `initiatives`, `mood`, `notifications`, `recognitions`, `redemptions`, `rewards`, `settings`, `users`); `login/`, `forgot-password/`, `reset-password/` are public auth routes. API routes live in `api/`.

**Realtime:** `RealtimeProvider` (`src/providers/RealtimeProvider.tsx`) subscribes to Postgres changes for notifications, reactions, and chat via `use-realtime.ts` and `use-presence.ts`. The `supabase_realtime` publication includes: `recognitions`, `reactions`, `comments`, `notifications`.

---

## Edge Functions

18 functions live in `supabase/functions/`. Shared utilities are in `supabase/functions/_shared/`:

- `auth-middleware.ts` — `withEmployeeAuth()` wrapper (validates `x-session-token`); also exports `errorResponse()`/`jsonResponse()` helpers and CORS headers
- `supabase-client.ts` — `createAdminClient()` (service_role)
- `rate-limit.ts` — per-operation rate limit enforcement
- `notifications.ts` — shared push notification helpers
- `audit.ts` — shared audit logging helpers

Every new Edge Function should use `withEmployeeAuth` for authenticated routes or handle CORS OPTIONS manually for public routes. All DB writes use `adminClient` (service_role) — RLS is enforced at the DB layer, not the application layer.

**Function inventory:**

| Function | Purpose |
|----------|---------|
| `auth-signup` | Employee registration |
| `auth-invite` | Admin-initiated employee invite |
| `auth-me` | Fetch current employee profile |
| `auth-update-role` | Change employee role |
| `auth-deactivate-user` | Deactivate an employee account |
| `claim-employee-code` | Link employee code to account |
| `send-recognition` | Create a peer recognition |
| `boost-recognition` | Manager star boost on a recognition |
| `evaluate-badges` | Check + award badge criteria |
| `manage-redemption` | Admin approve/reject redemption |
| `redeem-reward` | Employee redeem from catalogue |
| `cancel-redemption` | Cancel a pending redemption |
| `submit-mood` | Log daily mood check-in |
| `refresh-leaderboard` | Rebuild leaderboard cache (cron) |
| `award-monthly-legend` | Pick monthly top performer (cron) |
| `daily-celebrations` | Birthday/work-anniversary push notifications (cron) |
| `reset-budgets` | Reset recognition budgets (cron) |
| `remove-background` | External AI image background removal — not behind `withEmployeeAuth`, handle CORS manually |

---

## Database Migrations

85 migrations (001–085, with a few gaps) in `supabase/migrations/`. Notable architectural migrations:

| Migration | What it does |
|-----------|-------------|
| 006 | RLS policies on all tables + Realtime publication |
| 008 | Atomic Postgres RPCs (recognition, redemption, refund, mood, leaderboard) |
| 017 | Hotel-level RLS isolation (replaces company_id-based isolation) |
| 032 | Rebuilt session architecture (`employee_active_sessions`) |
| 033 | Dynamic leaderboard (no more static cache) |
| 078 | Points system overhaul |
| 079 | Reward wallet (`trg_guard_wallet_balance` — blocks direct UPDATE, requires `indabacares.allow_wallet_update` GUC) |
| 080 | Sponsor ad campaigns |
| 081 | `mood_entries.user_id` made nullable (legacy NOT NULL constraint removed) |
| 082 | `admin_set_wallet_balance` SECURITY DEFINER RPC — sets `reward_wallet_balance` directly, bypassing guard trigger |
| 083 | `admin_set_points_balance` SECURITY DEFINER RPC — sets `points_balance` directly, bypassing `trg_guard_points_balance` |
| 084 | `notifications.company_id` made nullable — `trg_notify_redemption` inserts without it |
| 085 | `notifications.user_id` made nullable — same trigger, same pattern as 084 |

**Guard triggers** — `employees.points_balance` and `employees.reward_wallet_balance` are protected by triggers that block all direct UPDATEs. Use `admin_set_points_balance` / `admin_set_wallet_balance` RPCs instead. Never attempt to UPDATE these columns directly from application code.

**`points_ledger.source` CHECK constraint** — only specific values are allowed (e.g. `'admin_bonus'`, `'campaign_reward'`). The value `'admin_adjustment'` is NOT in the allowed list — use `'admin_bonus'` for admin-initiated balance corrections.

**Legacy NOT NULL pattern** — Several tables were created in early migrations (001–005) with `company_id` and `user_id` as NOT NULL. As the schema migrated to hotel-based tenancy, new code omits these columns. When a trigger or RPC inserts without them you get `null value in column "X" violates not-null constraint`. Fix with `ALTER TABLE public.<table> ALTER COLUMN <col> DROP NOT NULL;` (see migrations 074, 081, 084, 085 for prior examples).

**Immutable tables** — `star_transactions`, `point_transactions`, and `audit_logs` have triggers preventing UPDATE/DELETE. Never attempt to modify these rows.

To add a migration: `supabase migration new <description>`, edit the generated file, then `supabase db push --linked`.

`src/types/database.ts` is **manually maintained** — it does not use Supabase-generated types. Update it by hand when adding new tables or columns (or regenerate with `npx supabase gen types typescript --linked > src/types/database.ts` and merge carefully). Database enum mirrors for client-side use are in `src/types/enums.ts` — keep them in sync with `001_foundation.sql`.

---

## Shared Constants

`src/lib/constants.ts` is the single source of truth for:
- `COLORS` — brand palette (primary `#7C3AED`, etc.)
- `QUERY_KEYS` — React Query cache key factory (use in all new hooks)
- `PAGE_SIZE`, `MAX_RECIPIENTS`, `MAX_HASHTAGS`, `MIN/MAX_MESSAGE_LENGTH` — limits
- `RECOGNITION_BADGES`, `REACTION_EMOJIS`, `MOOD_MAP`, `VISIBILITY_OPTIONS`, `REDEMPTION_STATUS`
- `BADGE_ICONS`

Do not redeclare these values elsewhere.

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

Three cron jobs must be configured manually after migrations:

- `refresh-leaderboard` — daily at 02:00 UTC
- `reset-budgets` — 1st of month at 00:05 UTC
- `cleanup-rate-limits` — hourly

---

## Rate Limiting

Application-level rate limiting uses the `auth_rate_limits` table + `check_rate_limit()` function (migration 007). Edge Functions enforce per-operation limits (e.g., 5 recognitions/day, 5 redemptions/hour). Do not bypass these checks in new Edge Functions.

---

## Deployment

**Admin dashboard** is deployed as a standalone Vercel project under the `indabacares` GitHub/Vercel account, served at `indabacares.co.za`.

- Vercel root directory must be set to `admin`, framework preset `Next.js`
- `.vercelignore` uses `/`-prefixed paths (`/src`, `/app`, `/supabase`) to exclude mobile-only root dirs without accidentally stripping `admin/src/`
- Git commits must be authored by the account linked to the Vercel project (`hr@indabahotel.co.za`) — Hobby plan blocks deployments from unrecognised commit authors on private repos
- Admin env vars required in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_DOMAIN`
