-- ============================================================================
-- IndabaCares — Migration 008: Server-Side Business Procedures
-- Atomic Postgres functions called by Edge Functions inside transactions.
-- These guarantee consistency even under concurrent load.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. send_recognition — Atomic recognition + point/star allocation
-- --------------------------------------------------------------------------
-- Called by the send-recognition Edge Function.
-- Runs inside a single Postgres transaction with row-level locks.

create or replace function public.process_recognition(
  p_sender_id          uuid,
  p_company_id         uuid,
  p_recipient_ids      uuid[],
  p_thumbs_up_type_id  uuid,
  p_message            text,
  p_visibility         public.recognition_visibility,
  p_image_url          text default null,
  p_hashtags           text[] default '{}'
)
returns uuid  -- returns recognition_id
language plpgsql
security definer
set search_path = public
as $$
declare
  _sender         public.profiles%rowtype;
  _thumbs_up      public.thumbs_up_types%rowtype;
  _budget         public.budget_configs%rowtype;
  _recognition_id uuid;
  _recipient_id   uuid;
  _recipient      public.profiles%rowtype;
  _total_stars    integer;
  _sender_points  integer := 10;  -- points for sending
  _today_count    integer;
begin
  -- ── Lock sender row for consistent balance reads ─────────────────
  select * into strict _sender
  from public.profiles
  where id = p_sender_id and company_id = p_company_id
  for update;

  -- ── Validate thumbs up type ─────────────────────────────────────
  select * into strict _thumbs_up
  from public.thumbs_up_types
  where id = p_thumbs_up_type_id
    and company_id = p_company_id
    and is_active = true;

  if not found then
    raise exception 'Invalid or inactive thumbs-up type'
      using errcode = 'P1001';
  end if;

  -- ── Anti-fraud: no self-recognition ─────────────────────────────
  if p_sender_id = any(p_recipient_ids) then
    raise exception 'Cannot recognize yourself'
      using errcode = 'P1002';
  end if;

  -- ── Anti-fraud: daily send limit ────────────────────────────────
  _budget := public.resolve_budget(p_sender_id);

  select count(*) into _today_count
  from public.recognitions
  where sender_id = p_sender_id
    and created_at >= current_date
    and created_at < current_date + interval '1 day';

  if _today_count >= coalesce(_budget.max_recognitions_per_day, 5) then
    raise exception 'Daily recognition limit reached (%)', coalesce(_budget.max_recognitions_per_day, 5)
      using errcode = 'P1003';
  end if;

  -- ── Anti-fraud: duplicate detection (same sender→same recipients→same type within 1 hour) ──
  if exists (
    select 1
    from public.recognitions r
    join public.recognition_recipients rr on rr.recognition_id = r.id
    where r.sender_id = p_sender_id
      and r.thumbs_up_type_id = p_thumbs_up_type_id
      and r.created_at > now() - interval '1 hour'
      and rr.recipient_id = any(p_recipient_ids)
  ) then
    raise exception 'Duplicate recognition detected. Wait before sending similar recognition.'
      using errcode = 'P1004';
  end if;

  -- ── Validate all recipients exist and are active in same company ─
  if (
    select count(*)
    from public.profiles
    where id = any(p_recipient_ids)
      and company_id = p_company_id
      and is_active = true
  ) <> array_length(p_recipient_ids, 1) then
    raise exception 'One or more recipients are invalid or inactive'
      using errcode = 'P1005';
  end if;

  -- ── Calculate total stars needed ────────────────────────────────
  _total_stars := _thumbs_up.stars_awarded * array_length(p_recipient_ids, 1);

  -- ── Check sender giving balance ─────────────────────────────────
  if _sender.giving_balance < _total_stars then
    raise exception 'Insufficient giving balance. Have %, need %', _sender.giving_balance, _total_stars
      using errcode = 'P1006';
  end if;

  -- ── Per-recognition star cap ────────────────────────────────────
  if _budget.max_stars_per_recognition is not null
     and _thumbs_up.stars_awarded > _budget.max_stars_per_recognition then
    raise exception 'Stars per recognition exceeds maximum (%)', _budget.max_stars_per_recognition
      using errcode = 'P1007';
  end if;

  -- ═══════════════════════════════════════════════════════════════
  -- ALL VALIDATIONS PASSED — Begin mutations
  -- ═══════════════════════════════════════════════════════════════

  -- ── Create recognition ──────────────────────────────────────────
  insert into public.recognitions (
    id, company_id, sender_id, thumbs_up_type_id, message,
    visibility, stars_per_recipient, image_url, hashtags
  ) values (
    gen_random_uuid(), p_company_id, p_sender_id, p_thumbs_up_type_id,
    p_message, p_visibility, _thumbs_up.stars_awarded, p_image_url, p_hashtags
  )
  returning id into _recognition_id;

  -- ── Insert recipients ───────────────────────────────────────────
  insert into public.recognition_recipients (recognition_id, recipient_id)
  select _recognition_id, unnest(p_recipient_ids);

  -- ── Debit sender's giving balance ───────────────────────────────
  update public.profiles
  set giving_balance = giving_balance - _total_stars
  where id = p_sender_id;

  -- ── Credit sender points (for sending) ──────────────────────────
  update public.profiles
  set points_balance = points_balance + _sender_points
  where id = p_sender_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_sender_id, 'give', _sender_points,
    _sender.points_balance + _sender_points,
    'recognition', _recognition_id,
    format('Sent recognition to %s colleague(s)', array_length(p_recipient_ids, 1)),
    format('recog:send:%s', _recognition_id)
  );

  -- ── Credit each recipient: stars + points ───────────────────────
  foreach _recipient_id in array p_recipient_ids loop
    select * into _recipient
    from public.profiles
    where id = _recipient_id
    for update;

    -- Stars
    update public.profiles
    set stars_balance = stars_balance + _thumbs_up.stars_awarded
    where id = _recipient_id;

    insert into public.star_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, reference_id, description, idempotency_key
    ) values (
      p_company_id, _recipient_id, 'receive', _thumbs_up.stars_awarded,
      _recipient.stars_balance + _thumbs_up.stars_awarded,
      'recognition', _recognition_id,
      format('Received "%s" from %s', _thumbs_up.name, _sender.full_name),
      format('recog:star:%s:%s', _recognition_id, _recipient_id)
    );

    -- Points (for receiving)
    update public.profiles
    set points_balance = points_balance + 15
    where id = _recipient_id;

    insert into public.point_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, reference_id, description, idempotency_key
    ) values (
      p_company_id, _recipient_id, 'receive', 15,
      _recipient.points_balance + 15,
      'recognition', _recognition_id,
      format('Received "%s" from %s', _thumbs_up.name, _sender.full_name),
      format('recog:recv:%s:%s', _recognition_id, _recipient_id)
    );
  end loop;

  return _recognition_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 2. process_redemption — Atomic star debit + order creation + stock lock
-- --------------------------------------------------------------------------
create or replace function public.process_redemption(
  p_user_id    uuid,
  p_company_id uuid,
  p_reward_id  uuid
)
returns uuid  -- returns redemption_id
language plpgsql
security definer
set search_path = public
as $$
declare
  _user       public.profiles%rowtype;
  _reward     public.rewards%rowtype;
  _redemption_id uuid;
begin
  -- ── Lock user row ───────────────────────────────────────────────
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  -- ── Lock reward row (prevents overselling under concurrency) ────
  select * into strict _reward
  from public.rewards
  where id = p_reward_id
    and company_id = p_company_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Reward not found or inactive'
      using errcode = 'P2001';
  end if;

  -- ── Check stock ─────────────────────────────────────────────────
  if _reward.stock is not null and _reward.stock <= 0 then
    raise exception 'Reward is out of stock'
      using errcode = 'P2002';
  end if;

  -- ── Check balance ───────────────────────────────────────────────
  if _user.stars_balance < _reward.star_cost then
    raise exception 'Insufficient star balance. Have %, need %', _user.stars_balance, _reward.star_cost
      using errcode = 'P2003';
  end if;

  -- ═══════════════════════════════════════════════════════════════
  -- ALL VALIDATIONS PASSED
  -- ═══════════════════════════════════════════════════════════════

  -- ── Debit stars ─────────────────────────────────────────────────
  update public.profiles
  set stars_balance = stars_balance - _reward.star_cost
  where id = p_user_id;

  insert into public.star_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'redeem', -_reward.star_cost,
    _user.stars_balance - _reward.star_cost,
    'reward', p_reward_id,
    format('Redeemed "%s"', _reward.name),
    format('redeem:%s:%s:%s', p_user_id, p_reward_id, now()::text)
  );

  -- ── Decrement stock ─────────────────────────────────────────────
  if _reward.stock is not null then
    update public.rewards
    set stock = stock - 1
    where id = p_reward_id;
  end if;

  -- ── Create redemption order ─────────────────────────────────────
  insert into public.redemptions (
    company_id, user_id, reward_id, star_cost, status
  ) values (
    p_company_id, p_user_id, p_reward_id, _reward.star_cost, 'pending'
  )
  returning id into _redemption_id;

  return _redemption_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 3. process_refund — Atomic star refund for rejected/cancelled orders
-- --------------------------------------------------------------------------
create or replace function public.process_refund(
  p_redemption_id uuid,
  p_company_id    uuid,
  p_reason        text default 'Order cancelled/rejected'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _redemption public.redemptions%rowtype;
  _user       public.profiles%rowtype;
  _reward     public.rewards%rowtype;
begin
  select * into strict _redemption
  from public.redemptions
  where id = p_redemption_id and company_id = p_company_id
  for update;

  -- Only refund pending/approved/rejected orders (not already fulfilled)
  if _redemption.status not in ('pending', 'approved', 'rejected', 'cancelled') then
    raise exception 'Cannot refund a % order', _redemption.status
      using errcode = 'P2010';
  end if;

  -- Check not already refunded
  if exists (
    select 1 from public.star_transactions
    where reference_type = 'redemption'
      and reference_id = p_redemption_id
      and type = 'refund'
  ) then
    raise exception 'Refund already processed for this order'
      using errcode = 'P2011';
  end if;

  select * into strict _user
  from public.profiles where id = _redemption.user_id for update;

  -- ── Credit stars back ───────────────────────────────────────────
  update public.profiles
  set stars_balance = stars_balance + _redemption.star_cost
  where id = _redemption.user_id;

  insert into public.star_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, _redemption.user_id, 'refund', _redemption.star_cost,
    _user.stars_balance + _redemption.star_cost,
    'redemption', p_redemption_id,
    p_reason,
    format('refund:%s', p_redemption_id)
  );

  -- ── Restore stock ───────────────────────────────────────────────
  select * into _reward
  from public.rewards where id = _redemption.reward_id;

  if _reward.stock is not null then
    update public.rewards
    set stock = stock + 1
    where id = _redemption.reward_id;
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- 4. submit_mood — Validates once-per-day + awards points
-- --------------------------------------------------------------------------
create or replace function public.submit_mood(
  p_user_id    uuid,
  p_company_id uuid,
  p_mood       public.mood_value,
  p_note       text default null
)
returns uuid  -- returns mood_entry id
language plpgsql
security definer
set search_path = public
as $$
declare
  _user     public.profiles%rowtype;
  _entry_id uuid;
  _points   integer := 5;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  -- ── Once per day (UNIQUE constraint is backup) ──────────────────
  if _user.last_mood_date = current_date then
    raise exception 'Mood already submitted today'
      using errcode = 'P3001';
  end if;

  -- ── Insert mood entry ───────────────────────────────────────────
  insert into public.mood_entries (
    company_id, user_id, mood, note, entry_date
  ) values (
    p_company_id, p_user_id, p_mood, p_note, current_date
  )
  returning id into _entry_id;

  -- ── Update profile ──────────────────────────────────────────────
  update public.profiles
  set last_mood_date  = current_date,
      points_balance  = points_balance + _points
  where id = p_user_id;

  -- ── Record points ───────────────────────────────────────────────
  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'mood', _points,
    _user.points_balance + _points,
    'mood', _entry_id,
    'Daily mood check-in',
    format('mood:%s:%s', p_user_id, current_date)
  );

  return _entry_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 5. refresh_leaderboard — Recalculates rankings for all periods
-- --------------------------------------------------------------------------
create or replace function public.refresh_leaderboard(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _period record;
begin
  -- Process monthly, quarterly, annual
  for _period in
    select * from (values
      ('monthly',   to_char(current_date, 'YYYY-MM'),
                    date_trunc('month', current_date),
                    date_trunc('month', current_date) + interval '1 month'),
      ('quarterly', to_char(current_date, 'YYYY') || '-Q' || to_char(current_date, 'Q'),
                    date_trunc('quarter', current_date),
                    date_trunc('quarter', current_date) + interval '3 months'),
      ('annual',    to_char(current_date, 'YYYY'),
                    date_trunc('year', current_date),
                    date_trunc('year', current_date) + interval '1 year')
    ) as t(period_type, period_key, start_date, end_date)
  loop
    -- Upsert current period rankings
    with ranked as (
      select
        pt.user_id,
        sum(pt.amount) as total_points,
        row_number() over (order by sum(pt.amount) desc) as rank
      from public.point_transactions pt
      join public.profiles p on p.id = pt.user_id
      where pt.company_id = p_company_id
        and pt.amount > 0
        and pt.created_at >= _period.start_date::timestamptz
        and pt.created_at < _period.end_date::timestamptz
        and p.is_active = true
      group by pt.user_id
    ),
    previous_ranks as (
      select user_id, rank
      from public.leaderboard_cache
      where company_id = p_company_id
        and period_type = _period.period_type
        and period_key = _period.period_key
    )
    insert into public.leaderboard_cache (
      company_id, user_id, period_type, period_key,
      total_points, rank, rank_change, refreshed_at
    )
    select
      p_company_id,
      r.user_id,
      _period.period_type,
      _period.period_key,
      r.total_points::integer,
      r.rank::integer,
      coalesce(pr.rank - r.rank, 0)::integer,  -- positive = moved up
      now()
    from ranked r
    left join previous_ranks pr on pr.user_id = r.user_id
    on conflict (company_id, user_id, period_type, period_key)
    do update set
      total_points = excluded.total_points,
      rank = excluded.rank,
      rank_change = excluded.rank_change,
      refreshed_at = excluded.refreshed_at;
  end loop;
end;
$$;

-- --------------------------------------------------------------------------
-- 6. award_reaction_points — Points for reacting to recognitions
-- --------------------------------------------------------------------------
create or replace function public.award_reaction_points(
  p_user_id        uuid,
  p_company_id     uuid,
  p_recognition_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user   public.profiles%rowtype;
  _points integer := 2;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  update public.profiles
  set points_balance = points_balance + _points
  where id = p_user_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'react', _points,
    _user.points_balance + _points,
    'recognition', p_recognition_id,
    'Reacted to a recognition',
    format('react:%s:%s', p_user_id, p_recognition_id)
  )
  -- Idempotent: only award once per user per recognition
  on conflict (idempotency_key) do nothing;
end;
$$;

-- --------------------------------------------------------------------------
-- 7. award_comment_points — Points for commenting on recognitions
-- --------------------------------------------------------------------------
create or replace function public.award_comment_points(
  p_user_id        uuid,
  p_company_id     uuid,
  p_comment_id     uuid,
  p_recognition_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user   public.profiles%rowtype;
  _points integer := 3;
begin
  select * into strict _user
  from public.profiles
  where id = p_user_id and company_id = p_company_id
  for update;

  update public.profiles
  set points_balance = points_balance + _points
  where id = p_user_id;

  insert into public.point_transactions (
    company_id, user_id, type, amount, balance_after,
    reference_type, reference_id, description, idempotency_key
  ) values (
    p_company_id, p_user_id, 'comment', _points,
    _user.points_balance + _points,
    'comment', p_comment_id,
    'Commented on a recognition',
    format('comment:%s:%s', p_user_id, p_comment_id)
  )
  on conflict (idempotency_key) do nothing;
end;
$$;

-- --------------------------------------------------------------------------
-- 8. reset_monthly_budgets — Cron job: allocate giving stars
-- --------------------------------------------------------------------------
create or replace function public.reset_monthly_budgets(p_company_id uuid)
returns integer  -- number of users updated
language plpgsql
security definer
set search_path = public
as $$
declare
  _user      record;
  _budget    public.budget_configs%rowtype;
  _new_giving integer;
  _count     integer := 0;
begin
  for _user in
    select id, giving_balance, points_balance, role, department_id
    from public.profiles
    where company_id = p_company_id and is_active = true
    for update
  loop
    _budget := public.resolve_budget(_user.id);

    if _budget.id is null then
      continue;  -- no budget config applies
    end if;

    -- Calculate new giving balance
    if _budget.carry_over then
      _new_giving := _user.giving_balance + _budget.monthly_giving_stars;
    else
      _new_giving := _budget.monthly_giving_stars;
    end if;

    update public.profiles
    set giving_balance = _new_giving,
        points_balance = points_balance + 5  -- bonus for being active at reset
    where id = _user.id;

    -- Points for budget reset
    insert into public.point_transactions (
      company_id, user_id, type, amount, balance_after,
      reference_type, description, idempotency_key
    ) values (
      p_company_id, _user.id, 'budget_reset', 5,
      _user.points_balance + 5,
      'budget', format('Monthly budget reset: %s giving stars allocated', _new_giving),
      format('budget_reset:%s:%s', _user.id, to_char(current_date, 'YYYY-MM'))
    )
    on conflict (idempotency_key) do nothing;

    _count := _count + 1;
  end loop;

  return _count;
end;
$$;
