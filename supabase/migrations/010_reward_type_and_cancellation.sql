-- ============================================================================
-- IndabaCares — Migration 010: Reward Types & Self-Cancellation Support
-- Adds physical/digital/experience reward types with fulfillment fields,
-- and delivery tracking on redemptions.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Reward Type Enum
-- --------------------------------------------------------------------------
create type public.reward_type as enum (
  'physical',       -- requires shipping (merch, gift cards mailed)
  'digital',        -- instant delivery (e-codes, vouchers, subscriptions)
  'experience'      -- requires scheduling (team lunches, extra PTO, etc.)
);

-- --------------------------------------------------------------------------
-- 2. Add reward_type and fulfillment columns to rewards
-- --------------------------------------------------------------------------
alter table public.rewards
  add column reward_type           public.reward_type not null default 'physical',
  add column fulfillment_instructions text,    -- internal admin notes for fulfillment
  add column digital_content       text;       -- code/link/instructions for digital rewards (shown to user on fulfill)

comment on column public.rewards.reward_type is
  'physical = shipped, digital = instant code/link, experience = scheduled activity';
comment on column public.rewards.fulfillment_instructions is
  'Internal notes for admins on how to fulfill this reward (not shown to users)';
comment on column public.rewards.digital_content is
  'Template or actual content for digital rewards (e.g., vendor API endpoint, code pool reference)';

-- --------------------------------------------------------------------------
-- 3. Add delivery tracking to redemptions
-- --------------------------------------------------------------------------
alter table public.redemptions
  add column shipping_address      jsonb,      -- { street, city, state, zip, country } for physical
  add column delivery_info         text,       -- fulfillment details shown to user (tracking #, digital code, etc.)
  add column cancelled_at          timestamptz; -- when user self-cancelled

comment on column public.redemptions.shipping_address is
  'Shipping address for physical rewards. Null for digital/experience.';
comment on column public.redemptions.delivery_info is
  'Fulfillment details visible to user: tracking number, digital code, download link, etc.';

-- --------------------------------------------------------------------------
-- 4. Index for reward_type filtering
-- --------------------------------------------------------------------------
create index idx_rewards_type
  on public.rewards(company_id, reward_type)
  where is_active = true;
