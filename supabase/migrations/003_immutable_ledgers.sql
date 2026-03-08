-- ============================================================================
-- IndabaCares — Migration 003: Immutable Ledgers
-- Point transactions & star transactions — append-only financial audit trail
-- ============================================================================

-- --------------------------------------------------------------------------
-- DESIGN RATIONALE
-- --------------------------------------------------------------------------
-- Both ledgers follow double-entry-inspired principles:
--   1. APPEND-ONLY — no UPDATE or DELETE is ever permitted (enforced by RLS
--      and by granting only INSERT to the service role functions).
--   2. BALANCE SNAPSHOT — every row records balance_after so any row can be
--      independently audited without replaying the full history.
--   3. SIGNED AMOUNTS — positive = credit, negative = debit.
--   4. REFERENCE LINKING — reference_type + reference_id tie each transaction
--      back to the business event (recognition, redemption, etc.).
--   5. IDEMPOTENCY KEY — optional field to prevent duplicate processing in
--      Edge Functions using ON CONFLICT.
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- 1. Point Transactions (leaderboard currency)
-- --------------------------------------------------------------------------
create table public.point_transactions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            public.point_tx_type not null,
  amount          integer not null,                    -- positive = credit, negative = debit
  balance_after   integer not null,                    -- snapshot for audit
  reference_type  text,                                -- 'recognition', 'reaction', 'comment', 'mood', etc.
  reference_id    uuid,                                -- FK to the source entity
  description     text,                                -- human-readable reason
  idempotency_key text,                                -- prevents duplicate processing
  created_at      timestamptz not null default now(),

  constraint chk_point_amount_nonzero check (amount <> 0)
);

comment on table public.point_transactions is
  'Immutable append-only ledger for points (leaderboard currency). '
  'No UPDATE or DELETE is ever permitted. Every mutation to points_balance on profiles '
  'must have a corresponding row here.';

-- Primary query: user's transaction history
create index idx_point_tx_user_time
  on public.point_transactions(user_id, created_at desc);

-- Tenant isolation
create index idx_point_tx_company
  on public.point_transactions(company_id);

-- Idempotency lookups
create unique index idx_point_tx_idempotency
  on public.point_transactions(idempotency_key)
  where idempotency_key is not null;

-- Leaderboard aggregation (points earned in a period per user)
create index idx_point_tx_leaderboard
  on public.point_transactions(company_id, user_id, created_at)
  where amount > 0;

-- Reference lookups (find all txns for a given recognition, etc.)
create index idx_point_tx_reference
  on public.point_transactions(reference_type, reference_id)
  where reference_id is not null;

-- --------------------------------------------------------------------------
-- 2. Star Transactions (reward currency)
-- --------------------------------------------------------------------------
create table public.star_transactions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            public.star_tx_type not null,
  amount          integer not null,                    -- positive = credit, negative = debit
  balance_after   integer not null,                    -- snapshot for audit
  reference_type  text,                                -- 'recognition', 'redemption', etc.
  reference_id    uuid,                                -- FK to the source entity
  description     text,
  idempotency_key text,
  created_at      timestamptz not null default now(),

  constraint chk_star_amount_nonzero check (amount <> 0)
);

comment on table public.star_transactions is
  'Immutable append-only ledger for stars (reward currency). '
  'Stars are earned by receiving thumbs-ups and spent on reward redemptions. '
  'No UPDATE or DELETE is ever permitted.';

-- Primary query: user's star history
create index idx_star_tx_user_time
  on public.star_transactions(user_id, created_at desc);

-- Tenant isolation
create index idx_star_tx_company
  on public.star_transactions(company_id);

-- Idempotency lookups
create unique index idx_star_tx_idempotency
  on public.star_transactions(idempotency_key)
  where idempotency_key is not null;

-- Reference lookups
create index idx_star_tx_reference
  on public.star_transactions(reference_type, reference_id)
  where reference_id is not null;

-- --------------------------------------------------------------------------
-- 3. Ledger Integrity Functions
-- --------------------------------------------------------------------------

-- Verify that the running balance matches the sum of all transactions.
-- Called by scheduled health checks or admin tools.
create or replace function public.verify_point_balance(target_user_id uuid)
returns table(stored_balance integer, computed_balance bigint, is_consistent boolean)
language sql
stable
as $$
  select
    p.points_balance as stored_balance,
    coalesce(sum(pt.amount), 0)::bigint as computed_balance,
    p.points_balance = coalesce(sum(pt.amount), 0) as is_consistent
  from public.profiles p
  left join public.point_transactions pt on pt.user_id = p.id
  where p.id = target_user_id
  group by p.id, p.points_balance;
$$;

create or replace function public.verify_star_balance(target_user_id uuid)
returns table(stored_balance integer, computed_balance bigint, is_consistent boolean)
language sql
stable
as $$
  select
    p.stars_balance as stored_balance,
    coalesce(sum(st.amount), 0)::bigint as computed_balance,
    p.stars_balance = coalesce(sum(st.amount), 0) as is_consistent
  from public.profiles p
  left join public.star_transactions st on st.user_id = p.id
  where p.id = target_user_id
  group by p.id, p.stars_balance;
$$;

-- --------------------------------------------------------------------------
-- 4. Prevent mutations on ledger rows (belt-and-suspenders with RLS)
-- --------------------------------------------------------------------------
-- Even if RLS is bypassed via service_role, these triggers prevent updates/deletes.

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger rows are immutable. UPDATE and DELETE are prohibited.';
end;
$$;

create trigger trg_point_tx_immutable
  before update or delete on public.point_transactions
  for each row execute function public.prevent_ledger_mutation();

create trigger trg_star_tx_immutable
  before update or delete on public.star_transactions
  for each row execute function public.prevent_ledger_mutation();
