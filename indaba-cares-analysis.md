# Indaba Cares — Functional Analysis for the Board

*A plain-language walkthrough of what the system actually does, based on a direct read of the source code, database migrations, and server functions as of this analysis (2026-08-04).*

**Terminology used consistently in this document:**
- **Points** = "Recognition Points" (the app's internal name is `points_balance` / "RP") — earned by being recognised, reacting, checking in mood, etc. This is an *engagement score*, not currency.
- **Reward Wallet credits** = the actual spendable currency, converted from Points at a fixed 5:1 rate. Employees redeem rewards with Wallet credits, not raw Points.
- **Rewards** = catalogue items employees can redeem (gift vouchers, hotel experiences).
- **Redemption** = one employee's order for one reward.

The code itself is *not* fully consistent — some database columns and older files still say "stars." Where that happens it is flagged explicitly.

---

## 1. System Overview

Indaba Cares is three connected pieces of software working off one shared database:

- **A mobile app** (for phones) that every hotel employee uses to give and receive recognition, check their mood, browse rewards, and see a leaderboard.
- **An admin website** that hotel managers and head-office staff use to manage employees, approve reward orders, run campaigns, and see analytics.
- **A backend** (Supabase, a hosted database + serverless function service) that stores everything and enforces the business rules — most importantly, that no hotel can ever see another hotel's data.

In plain terms: an employee opens the app, gives a colleague a "Thumbs Up" with a short message, that colleague earns points, and over time can trade those points for real rewards (vouchers, hotel stays, experiences) that a hotel admin approves and fulfils. The system tracks who's the top performer each month, celebrates birthdays and work anniversaries automatically, and lets admins run limited-time "double points" campaigns.

The database is organised around **hotels**, not one single company — every employee, recognition, reward, and redemption is tagged with a specific hotel (e.g. "Indaba Hotel", "Chobe Safari Lodge"), and the database itself refuses to let one hotel's data leak into another's queries, even if application code has a bug. This is enforced at the database level, which is a stronger guarantee than trusting the app's front-end code alone.

Employees do not log in with an email/password like a typical app — they log in with a **name + employee code + hotel**, since many hospitality workers don't have a company email address. Admins, by contrast, log into the admin website with a normal email and password.

---

## 2. Core Data Models

All entities below are hotel-scoped (a `hotel` text field ties every row to one of six hotels) unless noted. Table definitions live under `supabase/migrations/`.

### Employee (`public.employees`)
The single source of truth for who works where. **Note:** an earlier version of the system (migrations 001–016) used a completely different model based on Supabase's built-in "auth users" and a `profiles`/`companies` table. That model was fully removed in migrations 029/030 — it is dead weight in the migration history but no longer live.
- Key fields: `full_name`, `employee_code` (login credential), `hotel`, `department`, `position`, `status` (active/inactive/suspended), `password_hash` (bcrypt; null until first login), `points_balance`, `converted_points`, `reward_wallet_balance`, `highest_tier_reached` (newcomer/bronze/silver/gold), `is_manager`, `email` (added later, used for voucher emails), `has_seen_welcome`.
- Two balance columns are guarded by database triggers that **block any direct update** — they can only change through specific approved functions (`admin_set_points_balance`, `admin_set_wallet_balance`, or the normal earn/redeem functions). This prevents a coding mistake or bug anywhere else in the app from silently crediting or debiting an employee's balance.
- Defined in `supabase/migrations/014_employee_auth_table.sql`, heavily modified in `017`, `019`, `030`, `048`, `064`, `073`, `075`, `078`, `079`.

### Recognition (`public.recognitions`)
A "Thumbs Up" — one employee publicly recognising another with a short message and a badge/category (e.g. "Team Player", "Hospitality Hero", or a skill badge like "Communication"). Recognitions can be liked and commented on, and the recipient can post a one-time reply.
- Key fields: `sender_id`, `receiver_id`, `message` (min 10 characters via the send function), `badge`, `card_type` (`recognition` or `skills`), `hotel`, `recipient_response`.
- A database rule prevents someone recognising themselves.
- Defined in `supabase/migrations/018_recognition_feed.sql`, badge list expanded in `078`.

### Reaction (`public.recognition_reactions`)
An emoji reaction (heart / smile / thumbs-up) on someone else's recognition post — one per person per post. Each employee has a shared **monthly budget of 100 reactions total** (not 100 of each type) to prevent spamming reactions purely to farm points. Defined in `038_reactions_consolidated.sql`, budget unified in `078`.

### Points/Stars Balance
Not a single value but three related numbers on the Employee row, explained in detail in Section 3–5:
- `points_balance` — lifetime engagement score, never decreases on its own.
- `converted_points` — how much of that score has already been "cashed in."
- `reward_wallet_balance` — actual spendable credits.
Every point-earning or -spending event is also written permanently to `points_ledger` (an audit trail that can never be edited or deleted), so there is always a full history of why a balance is what it is.

### Reward (`public.rewards`)
A catalogue item employees can redeem: name, description, image, `points_required` (in Reward Wallet credits, despite the column name), `stock` (null = unlimited), `category` (`retail` = external vouchers like fast-food chains; `hotel` = in-house experiences like a free breakfast), and an optional `wicode` field (see Section 8). Defined in `019_rewards_catalogue.sql`, extended in `051`, `065`, `070`.

### Redemption (`public.redemptions`)
One employee's order for one reward. Tracks `status` (pending → approved → fulfilled, or rejected/cancelled), `points_used` (snapshot of the cost at order time), timestamps for each stage, and an optional rejection reason. Defined in `019`/`020`, corrected in `071`, updated for the Wallet system in `079`.

### Badge (`public.badges` / `public.user_badges`)
Achievement definitions (e.g. "Sent 50 recognitions", "30-day mood streak") that admins can create/edit from the dashboard. `user_badges` records who has earned what. **Important caveat:** see Section 9 — the automated process that is supposed to check and award these badges is broken (references database tables that no longer exist), so badges are effectively not being awarded automatically at present, even though the catalogue and display UI both work.

### Team/Department
Department is a free-text field on the employee record (`department`), not its own linked table in the current schema (an earlier `departments` table existed but was dropped with the rest of the old model). Mobile screens group employees by department for the "Team" view.

### Wallet Transaction (`public.reward_conversions`)
An immutable audit record of every time an employee converts Points into Wallet credits (5 Points → 1 credit). Defined in `079_reward_wallet.sql`.

### Campaign (`public.campaigns`)
An admin-defined, time-boxed multiplier (e.g. "Customer Service Week — 2× points") scoped to one hotel. While active, every recognition received during the window earns bonus points on top of the base 10, recorded separately in the ledger so it's fully auditable. Defined in `024_campaigns.sql`, extended for sponsor ads in `080`.

### Initiative (`public.initiatives`)
Admin-managed content blocks for fixed CSR/culture tabs in the app ("Billy Says", "Feed the Kids", "Mandela Day") — images, an optional video, a mascot image. Not a user-generated feature; purely admin-authored content. Defined in `051_media_storage.sql`.

### Mood entry (`public.mood_entries`)
A once-per-day, private wellbeing check-in (awful/bad/okay/good/amazing scale) with an optional note. Submitting awards 5 points. Individual entries are private; only aggregated happiness scores are meant to be visible to admins. Originally defined in `004`, reattached to the employee model in `069`.

### Notification (`public.notifications`)
In-app alert record (recognition received, reward approved/rejected, badge earned, etc.), delivered live via Supabase's real-time feature and/or push notification. Defined in `005`, reworked for the employee model across `017`, `023`, `084`, `085`.

### Channel post (`public.channel_posts`)
Not explicitly requested above but worth noting: a WhatsApp-Channel-style public feed (photos/video/text) — only for Indaba Hotel and Chobe Safari Lodge — readable across hotels by all employees. Defined in `086_channel_posts.sql`.

---

## 3. Reward Lifecycle — Earned

Every way an employee's Points balance can go up:

| Mechanism | Points | Trigger / Rule | Code path |
|---|---|---|---|
| Receiving a recognition ("Thumbs Up") | +10 | Automatic, fires the instant a recognition is inserted | DB trigger `award_recognition_points()` on `recognitions` table insert; app-side entry point is the `send-recognition` Edge Function |
| Receiving a recognition during an active campaign | +10 base, plus bonus (base × (multiplier−1)) | Campaign must be currently running for that hotel; highest active multiplier wins if several overlap | Same trigger, calls `active_campaign_multiplier()` |
| Receiving an emoji reaction | +1 (was different values per emoji type historically — heart=50/smile=20/thumb=10 — simplified to a flat 1 point in migration 078) | Reactor has a shared monthly budget of 100 reactions; exceeding it is rejected with an error before the reaction is even saved | Trigger `award_reaction_points()` on `recognition_reactions` |
| Responding to a recognition you received (one-time reply) | +5 | Only the recipient can respond, and only once per recognition | RPC `submit_recognition_response()` |
| Daily mood check-in | +5 | Once per calendar day (hard database constraint, not just app-side) | RPC `submit_mood()`, called via `submit-mood` Edge Function |
| Birthday or work anniversary | +100 each | Auto-detected daily; one row per event per day, so it can't double-fire | Trigger `award_celebration_points()`, fed by the `daily-celebrations` cron job (`generate_today_celebrations()`) |
| Crossing into a new status tier (bronze/silver/gold) | +50 | Fires automatically the moment a balance crosses 100 / 500 / 2000 points; only once, going forward, never for dropping back down | Trigger `check_status_unlock()` |
| Manager "boost" on someone else's recognition | +25 | Any logged-in employee can currently trigger this (see Gaps — role restriction is not yet enforced in code); cannot boost your own post | `boost-recognition` Edge Function → `admin_grant_points()` RPC |
| Admin one-off bonus | Any amount, admin's choice | Manual, from the admin dashboard | `admin_grant_points()` RPC |
| Monthly "Legend of the Month" award | +250 | Automatic, once a month, to whoever is #1 on that hotel's leaderboard for the month just ended; a special recognition card is posted for them too | `award-monthly-legend` cron function (secured by a separate secret key, not the normal employee login) |

**Anti-abuse / rate limiting** built into these flows:
- Sending recognitions: max 10 per employee per hour.
- Boosting: max 20 per employee per hour.
- Reactions: shared monthly pool of 100 (any mix of heart/smile/thumbs-up).
- Redeeming rewards: max 5 attempts per hour (checked in the redemption function, see Section 5).
- First-time password setup: max 5 attempts per 15 minutes per employee code + hotel, to block brute-force guessing.

**Scheduled/automated jobs** (run in the background, not triggered by a person clicking anything):
- `daily-celebrations` — once a day, finds today's birthdays/anniversaries, credits points, and sends push notifications.
- `award-monthly-legend` — last day of each month, picks the winner per hotel.
- `refresh-leaderboard` — periodic housekeeping (refreshes the mood/happiness statistics view, generates cropped "podium" photos for the top 3 on each hotel's leaderboard, clears expired rate-limit records). The ranked leaderboard itself is calculated live from the audit trail every time someone views it — there is no separate leaderboard table that needs refreshing (a stale-cache design was deliberately removed, per migration `033`).
- `reset-budgets` — **documented as a live cron job in the operations notes, but its code queries database tables (`companies`, `profiles`) that were permanently deleted in an earlier cleanup migration.** In its current form this job would fail every time it runs; see Section 9.

---

## 4. Reward Lifecycle — Received

When an employee receives a recognition, reaction, boost, badge, or reward-status update, the flow is:

1. The event happens (someone sends a recognition, an admin approves a redemption, etc.).
2. A row is written to `notifications` for the recipient, tagged with a type (e.g. `recognition_received`, `reward_approved`) and a reference back to the underlying record.
3. Because the `notifications` table is registered with Supabase's live-update feature, any employee with the app open sees the notification appear instantly without refreshing.
4. Separately, if the employee has push notifications enabled on their phone, an Expo push message is also sent (used specifically for birthdays/anniversaries today; other notification types rely on the in-app real-time channel).
5. The employee's Points balance is updated in the same database transaction as the triggering event — there is no separate "pending" state for points; the balance reflects reality the instant the action completes.
6. There is **no approval or moderation step for earning points** — recognitions post immediately and are visible to the whole hotel feed right away (unless marked private/team-only in older code — the "visibility" concept exists in the historical schema but the current, live `recognitions` table has no visibility field, so all recognitions in the current build are effectively hotel-wide public, [inferred] pending confirmation this matches intended product behaviour).

The employee sees their live balance summarised on the Wallet/Rewards tab via a single function (`get_wallet_stats`) that returns everything at once: current Points, how much has already been converted, how much Wallet balance is spendable right now, and how many credits they've converted so far this month.

---

## 5. Reward Lifecycle — Redeemed

**Step 1 — Convert Points to Wallet credits.** Points on their own cannot buy anything. An employee must first convert Points into Wallet credits at a fixed **5 Points = 1 credit** rate, in multiples of 5. This is a deliberate design choice separating "how engaged and recognised am I" (Points, which never goes down) from "how much can I actually spend" (Wallet credits). Every conversion is permanently logged (`reward_conversions`) and cannot exceed the amount of Points not already converted.

**Step 2 — Browse the catalogue.** All active rewards for the employee's hotel are shown, including out-of-stock ones (so employees can still see what's coming). Each shows its Wallet-credit cost, image, and (for hotel-category rewards) terms and conditions.

**Step 3 — Submit a redemption request.** The employee taps "Redeem." This calls a single atomic database function (`redeem_reward`) that, in one indivisible operation:
   - Locks the reward row so two people can't grab the last unit of stock at the same instant.
   - Confirms the reward is in stock (skipped for unlimited-stock items).
   - Confirms the employee's Wallet balance covers the cost.
   - Deducts the credits, decrements stock by one, and creates a `redemptions` row with status `pending`.
   - If anything fails (out of stock, insufficient balance), nothing is changed and a clear error is returned — there's no possibility of credits being deducted without a redemption being recorded, or vice versa.
   - Rate-limited to 5 redemption attempts per employee per hour.

**Step 4 — Admin fulfilment.** This is a **manual, human-approved step, not automated.** From the admin dashboard, staff can:
   - **Approve** (`pending → approved`). If the reward is a "hotel"-category experience (not a retail voucher) and the employee has an email on file, an automated voucher email is sent via Resend at this point, containing the reward details and a voucher code (currently just the internal redemption ID — see Section 8 for the planned real barcode integration that is not yet built).
   - **Reject** (`pending`/`approved → rejected`), with a required reason. Rejecting automatically refunds the Wallet credits and restores stock — fully atomic, same pattern as redemption.
   - **Fulfil** (`approved → fulfilled`) once the physical/digital reward has actually been handed over or delivered.
   - Every admin action here calls a specific, purpose-built database function directly (`approve_redemption`, `reject_redemption`, `fulfill_redemption`) from the admin website's server-side code — this is the actual live path used in production.

**Failure / rollback handling:** built entirely around "nothing happens unless everything succeeds" atomic database functions — there is no separate cleanup or reconciliation job needed, because a half-finished redemption (points taken but no order created, or vice versa) is structurally impossible given how the functions are written.

**A note on cancellation:** the mobile app code contains a "cancel my own pending order" concept, but as currently wired it is just an alias that calls the same function an admin uses to reject an order — meaning, practically, self-service cancellation and admin rejection are the same underlying action today. See Section 9 for a related code inconsistency found in this area.

---

## 6. Roles, Permissions & Admin Flows

**Employee-side roles** (mobile app):
- **Regular employee** — the default. Can send/receive recognitions, react, comment, check in mood, browse and redeem rewards, view their own data and their hotel's public feed/leaderboard.
- **Manager flag** (`is_manager` on the employee record) — exists in the schema (migration `073`) but at the time of this review is not yet wired into any specific extra permission in the mobile app's own logic — the "boost" feature, which conceptually should be manager-only, is currently callable by any logged-in employee (flagged explicitly in the boost-recognition code's own comments as a known gap awaiting a proper role check).
- A special cross-hotel case: employees at **"African Procurement Agencies"** (a head-office-style entity, not a physical hotel) can send recognitions to employees at *any* hotel, not just their own — everyone else is restricted to their own hotel.

**Admin-side roles** (admin website, standard email/password login):
- **Hotel admin** — scoped to one hotel via a tag on their login account; manages employees, rewards, redemptions, campaigns, initiatives, channel posts for that hotel only.
- **Super admin** — sees everything across all hotels, plus two extra restricted areas: **Audit Logs** and **Settings**, which are hard-blocked for regular hotel admins by the site's own gatekeeping code (`admin/src/proxy.ts`) before a page even loads.

**How permissions are actually enforced (defence in depth — three separate layers, so a bug in one doesn't expose data):**
1. **App layer** — mobile queries explicitly filter by the logged-in employee's hotel.
2. **Database layer (the strongest guarantee)** — every table has Row Level Security rules that check the requester's hotel against a database function that reads a login session token; if that check fails, the database itself refuses to return or accept the row, regardless of what the app asked for.
3. **Admin website layer** — a Next.js "proxy" (middleware) function runs before every page request: redirects logged-out users to the login page, blocks anyone whose account isn't tagged `admin` or `super_admin`, and further restricts Audit Logs / Settings to `super_admin` only.

**Typical admin functions:** approve/reject/fulfil reward orders (with automated voucher emails); create and edit reward catalogue items; bulk-import employees via CSV; adjust an employee's points or wallet balance directly (through the guarded RPCs only — direct database edits are blocked); create recognition campaigns; manage the CSR "initiatives" tab content; post to the hotel channel feed; view analytics and audit logs (super admin only).

---

## 7. End-to-End User Journeys

**Journey 1 — An employee recognises a colleague**
1. Employee opens the app, taps the "Give" button, picks a colleague and a badge category (e.g. "Going the Extra Mile"), writes a message of at least 10 characters. *(`app/(tabs)/give`, function `sendRecognition` → Edge Function `send-recognition`)*
2. The system checks: not recognising yourself, message isn't spam-length, not more than 10 sends this hour, recipient is a real active employee at the same hotel (or any hotel, if the sender is at APA). *(inside `send-recognition/index.ts`)*
3. The recognition posts immediately to the feed. *(insert into `recognitions`)*
4. A database trigger fires instantly, crediting the recipient +10 points (or more if a campaign is running) and writing a permanent audit-trail entry. *(`award_recognition_points()`)*
5. The recipient gets a real-time notification and sees their new balance next time they open the Wallet tab. *(`notifications` insert + `get_wallet_stats` RPC)*

**Journey 2 — An employee redeems a reward**
1. Employee opens the Rewards tab, sees their Wallet balance is too low for the item they want.
2. They tap "Convert Points," choose an amount (must be a multiple of 5, capped at their unconverted Points), and confirm. *(`convert_points_to_wallet` RPC)*
3. Their Wallet balance updates instantly; their Points balance is untouched (Points never decrease from converting).
4. They browse the catalogue, pick a reward, and tap "Redeem." *(`submitRedemption` → `redeem_reward` RPC)*
5. The system atomically checks stock and balance, deducts the Wallet credits, reserves the stock, and creates an order marked "pending." The employee sees a confirmation: "Reward redeemed! Your order is pending approval."
6. A hotel admin later reviews the order queue in the admin dashboard and taps "Approve." *(`approveRedemption` server action → `approve_redemption` RPC)*
7. If it's an in-house hotel experience and the employee has an email on file, a voucher email is sent automatically. The admin later marks it "Fulfilled" once delivered.

**Journey 3 — An admin runs a "double points" week**
1. Admin creates a campaign in the dashboard: title, a start and end date, and a multiplier (e.g. 2×), scoped to their hotel.
2. For the whole window, every recognition received at that hotel earns the normal 10 points *plus* a bonus recorded as a separate, clearly-labelled ledger entry so the effect is fully auditable afterwards. *(`active_campaign_multiplier()` inside the recognition-points trigger)*
3. If two campaigns happen to overlap, the system automatically applies whichever has the bigger multiplier — employees are never short-changed by an overlap. *(`active_campaign_multiplier()` picks the highest)*
4. The mobile app displays an in-app banner showing the active campaign and how many days remain. *(`get_active_campaigns` RPC)*

**Journey 4 — Monthly "Legend of the Month"**
1. On the last day of every month, an automated job runs (protected by a secret key, not a normal login) for every hotel.
2. It finds whoever is #1 on that hotel's leaderboard for the month, checks it hasn't already been awarded (so re-running the job by accident causes no harm), and credits them +250 points.
3. It automatically posts a celebratory recognition card to the feed on their behalf, records the win permanently, and sends them a push/in-app notification announcing they're this month's Legend.

**Journey 5 — A new employee's first login**
1. HR/an admin pre-loads the employee into the system with their name, a unique employee code, and their hotel — no email required at this stage.
2. The employee downloads the app, enters their full name, employee code, and selects their hotel, then sets a password for the first time. *(`first_time_authenticate` RPC — everything happens as one all-or-nothing database transaction, specifically engineered to avoid a half-finished signup)*
3. The system checks: not too many recent attempts (anti brute-force), password is a sensible length, the code/hotel/name combination matches an active, not-yet-activated employee record.
4. A login session is created and the app stores a session token securely on the device; this token is sent with every future request instead of a traditional login token.
5. First-time employees are routed straight to their profile (the original "welcome video" onboarding step has since been removed from the product, though the underlying "have they seen the welcome" flag is still recorded for consistency).

---

## 8. Integrations & External Dependencies

| Integration | What it does | Status / failure mode |
|---|---|---|
| **Resend (email)** | Sends the automated reward voucher email when an admin approves a "hotel"-category redemption (e.g. free breakfast, spa visit) and the employee has an email on file. | Live and working. Deliberately non-blocking: if the email send fails for any reason, the approval itself still goes through — the failure is only logged, never shown to the admin as an error, so a flaky email provider can never trap an order in limbo. |
| **Expo Push Notifications** | Sends phone push alerts, currently used specifically for birthday/anniversary celebrations (`daily-celebrations` job). Other notification types (recognitions, reward status changes) rely on the in-app real-time feed rather than push. | Live. Sent in batches of up to 100 per request to Expo's push service; no confirmation/retry logic is visible if Expo's service itself is down for a batch. |
| **Yoyo Rewards / WiCode (retail voucher barcodes)** | **Planned, not built.** The rewards table already has a spot to store a WiCode value, and admins can type one in manually for retail-category rewards, but no live connection exists yet — it is never used in the voucher email or shown to the employee. The intended vendor and API (Yoyo Rewards' "Issue Your Own Barcode" product) have been identified but not integrated. | Not live. When built, it would only require changes in three specific files — no mobile app update needed, since the mobile app doesn't need to know about it. |
| **Supabase Realtime** | Powers instant, no-refresh delivery of notifications, reactions, and comments to anyone with the app open. | Live; core to the "receiving" experience described in Section 4. |
| **pg_cron (scheduled jobs)** | Triggers the five background jobs (leaderboard refresh, monthly budget/legend jobs, celebrations, rate-limit cleanup) on a timer, by calling the relevant Edge Function over HTTPS from inside the database itself. | Documented as working for 4 of 5 jobs; the 5th (`reset-budgets`) is scheduled but its code is broken — see Section 9. Notably, per the team's own operational notes, a job can appear to "succeed" in the scheduling log while its actual HTTP call silently failed — this has previously cost real debugging time and is a known sharp edge of this setup, not specific to this report. |

---

## 9. Gaps, Assumptions & Open Questions

These are concrete findings from reading the code, not speculation — each is something a developer should confirm or fix, several of which materially affect what actually works today in production:

1. **`reset-budgets` (the monthly "giving budget" reset job) is broken.** Its code queries a `companies` table and a `profiles` table that were permanently deleted from the database in a cleanup migration (`030_schema_cleanup.sql`) months ago, when the system moved from the old "company/profile" model to the current "hotel/employee" model. As currently written, this job would fail on every scheduled run. It is still listed as an active, working cron job in the team's own operational notes — **this is likely a silent, ongoing failure the team is not aware of**, since (per the team's own documented experience with this exact pg_cron setup) a scheduling failure doesn't always surface as an obvious error.

2. **Automatic badge awarding is broken.** The `evaluate-badges` function that is supposed to check whether someone has earned an achievement (e.g. "sent 50 recognitions") also queries the old, deleted `profiles`/`company_id` model. Badge *definitions* can still be created and edited by admins, and employees can still see how many badges they've earned, but nothing is currently running the actual "did you earn a new one?" check. In effect, the badge *system* exists and is visible, but no new badges are being handed out automatically. [Confirmed by reading the function code against the current live schema — not directly tested against a running database.]

3. **Several Edge Functions appear to be legacy/unused, superseded by newer code paths that call the database directly:**
   - `manage-redemption` — still written against the old company/star-based model (`company_id`, `star_cost`, a `process_refund` function that no longer exists). The admin dashboard's actual, live redemption approval flow (`admin/src/app/actions/redemptions.ts`) bypasses this function entirely and calls the correct, current database functions directly.
   - `redeem-reward` and `cancel-redemption` — each call a database function with an extra parameter, or a function name, that doesn't match what currently exists in the database (would error if actually invoked). The mobile app's real redemption code (`src/api/reward-service.ts`) also bypasses these and calls the correct database function directly.
   - `claim-employee-code` — belongs entirely to the old company/profile onboarding model, which has been replaced by the employee-code + hotel first-login flow described in Journey 5. The tables it depends on (`employee_codes`, `profiles`) no longer exist.
   - **Recommendation:** these should either be deleted (to avoid confusion and reduce attack surface) or rewritten to match the current schema, since right now they are dead weight that could mislead a future developer into thinking they're the "correct" way to do these actions.

4. **The manager-only "boost" restriction is not enforced in code.** The code comment inside `boost-recognition` explicitly says role-based gating "should be enforced at the admin panel layer until a role column is added" — meaning today, any regular employee can technically call the boost function and grant a colleague +25 bonus points, not just managers. This should be confirmed as either an accepted temporary state or a genuine bug to fix.

5. **A recognition can currently be boosted more than once.** The database has no flag recording that a given recognition has already been boosted (an earlier, no-longer-live version of the schema had this, but the current live table doesn't). This is called out directly in the code's own comments as a known limitation.

6. **Self-cancellation and admin rejection are currently the same action.** The mobile "cancel my own order" function is wired as a direct alias for the admin "reject an order" function. This likely works fine functionally (an employee cancelling their own pending order does get refunded correctly) but means there's no code-level distinction between "I changed my mind" and "an admin declined this" — worth confirming this is the intended design rather than an oversight.

7. **No points-expiry mechanism exists.** Recognition Points, once earned, never expire or decay — there is no "use it or lose it" rule anywhere in the code. Whether that is the intended long-term policy (points as a permanent engagement score) is a business decision to confirm, not a technical limitation.

8. **Recognition visibility (public/team-only/private) does not currently exist in the live system**, even though an early version of the schema had this concept. Every recognition currently posts to the whole hotel's feed. Confirm this matches the intended product experience.

9. **The "Manager" role and department structure are lightweight.** `is_manager` is a simple yes/no flag on an employee record, and `department` is free text rather than a structured, linked table (an earlier, more elaborate department hierarchy was removed along with the old schema). This is fine for the current feature set but would need revisiting if more department-specific permissioning is planned.

10. **WiCode/retail-voucher integration is explicitly not live** (see Section 8) — flagging again here because it means retail rewards currently rely entirely on manual admin fulfilment outside the app, with no barcode ever reaching the employee through the system itself.

---

## 10. Illustration Opportunities

Suggested diagrams for the illustrated handbook, roughly in order of usefulness to a board audience:

1. **"How a Thumbs Up becomes a reward"** — a single end-to-end flow diagram: Employee A recognises Employee B → points land in B's account → B converts points to wallet credits → B redeems a reward → admin approves → voucher email sent. This is the single most important picture in the whole handbook; it explains the entire product in one image.

2. **The three-tier permission model** — a simple "who can see what" diagram showing App checks → Database checks → Admin website checks, with the hotel boundary drawn as a wall around each hotel's data. Useful for reassuring the board that tenant isolation is a database-enforced guarantee, not just good intentions in app code.

3. **Points vs. Wallet credits** — a two-lane diagram showing Points flowing in from six or seven different sources (recognition, reaction, mood check-in, birthday, etc.) into one pool, with a one-way "5:1 conversion valve" leading into a separate Wallet pool that only redemptions draw from. This directly addresses the most confusing part of the economy for a non-technical reader.

4. **The redemption order lifecycle** — a status-ladder diagram (pending → approved → fulfilled, with a rejected branch that loops back and refunds), showing which steps are automatic (system) versus manual (a human admin clicking a button).

5. **Monthly cycle calendar** — a simple annotated calendar showing the recurring automated events: daily celebrations check, monthly budget reset (currently broken — worth marking clearly if included), and the last-day-of-month Legend of the Month award. Good for showing the board this is a "living," continuously-running system, not just an app that only does things when someone opens it.

6. **The three workspaces** — a simple three-box diagram (Mobile App / Admin Website / Shared Backend) with arrows showing they all talk to one shared database, useful as the very first slide to orient a non-technical reader before diving into any flow.

---

*This analysis is based on a direct reading of `supabase/migrations/001` through `087`, the 18 Edge Functions under `supabase/functions/`, key mobile hooks/services under `src/`, and admin Server Actions/pages under `admin/src/`. Items marked [inferred] were not explicitly confirmed by a runtime test against the live database and should be verified with the engineering team before being presented as fact.*
