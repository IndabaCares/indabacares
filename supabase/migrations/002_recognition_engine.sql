-- ============================================================================
-- IndabaCares — Migration 002: Recognition Engine
-- Company values, thumbs-up types, recognitions, recipients, reactions, comments
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Company Values
-- --------------------------------------------------------------------------
create table public.company_values (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  icon        text,          -- emoji or icon identifier
  color       text,          -- hex color for UI badge
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  unique (company_id, name)
);

comment on table public.company_values is
  'Organization-defined values (e.g. Teamwork, Innovation) that recognitions are tied to.';

create index idx_company_values_company on public.company_values(company_id);

-- --------------------------------------------------------------------------
-- 2. Thumbs Up Types (5 configurable recognition categories)
-- --------------------------------------------------------------------------
create table public.thumbs_up_types (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  value_id        uuid references public.company_values(id) on delete set null,
  name            text not null,            -- e.g. "Great Teamwork"
  description     text,
  icon            text not null default '👍',
  color           text not null default '#4F46E5',
  stars_awarded   integer not null default 1, -- stars per recipient on receive
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint chk_stars_positive check (stars_awarded > 0),
  unique (company_id, name)
);

comment on table public.thumbs_up_types is
  'The 5 (or fewer) pre-defined recognition categories. Each awards a configurable number of stars.';

create index idx_thumbs_up_types_company on public.thumbs_up_types(company_id);

-- --------------------------------------------------------------------------
-- 3. Recognitions (core entity)
-- --------------------------------------------------------------------------
create table public.recognitions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  thumbs_up_type_id uuid not null references public.thumbs_up_types(id),
  message         text not null,
  visibility      public.recognition_visibility not null default 'public',
  stars_per_recipient integer not null,  -- snapshot from thumbs_up_type at send time
  image_url       text,
  hashtags        text[] default '{}',
  is_boosted      boolean not null default false,
  boosted_by      uuid references public.profiles(id),
  boosted_at      timestamptz,
  reaction_count  integer not null default 0,  -- denormalized
  comment_count   integer not null default 0,  -- denormalized
  created_at      timestamptz not null default now(),

  constraint chk_message_length   check (char_length(message) >= 10),
  constraint chk_stars_snapshot   check (stars_per_recipient > 0),
  constraint chk_boost_integrity  check (
    (is_boosted = false and boosted_by is null and boosted_at is null)
    or
    (is_boosted = true and boosted_by is not null and boosted_at is not null)
  )
);

comment on table public.recognitions is
  'Immutable recognition records. A sender recognizes one or more recipients with a thumbs-up type. '
  'stars_per_recipient is snapshotted at creation so later config changes do not rewrite history.';

-- Primary feed query: newest first within a company
create index idx_recognitions_feed
  on public.recognitions(company_id, created_at desc);

-- "My sent" query
create index idx_recognitions_sender
  on public.recognitions(sender_id, created_at desc);

-- Boosted recognitions float to top (partial index)
create index idx_recognitions_boosted
  on public.recognitions(company_id, boosted_at desc)
  where is_boosted = true;

-- --------------------------------------------------------------------------
-- 4. Recognition Recipients (many-to-many)
-- --------------------------------------------------------------------------
create table public.recognition_recipients (
  id              uuid primary key default gen_random_uuid(),
  recognition_id  uuid not null references public.recognitions(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,

  unique (recognition_id, recipient_id)
);

comment on table public.recognition_recipients is
  'Junction table supporting multi-recipient recognitions.';

-- "My received" query
create index idx_recognition_recipients_user
  on public.recognition_recipients(recipient_id, recognition_id);

-- --------------------------------------------------------------------------
-- 5. Reactions
-- --------------------------------------------------------------------------
create table public.reactions (
  id              uuid primary key default gen_random_uuid(),
  recognition_id  uuid not null references public.recognitions(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  emoji           text not null,  -- 'heart', 'clap', 'fire', 'celebrate'
  created_at      timestamptz not null default now(),

  -- One of each emoji type per user per recognition
  unique (recognition_id, user_id, emoji)
);

comment on table public.reactions is
  'Emoji reactions on recognitions. Max one of each type per user.';

create index idx_reactions_recognition
  on public.reactions(recognition_id);

-- Trigger: increment/decrement denormalized reaction_count on recognitions
create or replace function public.update_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.recognitions
    set reaction_count = reaction_count + 1
    where id = new.recognition_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.recognitions
    set reaction_count = greatest(reaction_count - 1, 0)
    where id = old.recognition_id;
    return old;
  end if;
end;
$$;

create trigger trg_reaction_count
  after insert or delete on public.reactions
  for each row execute function public.update_reaction_count();

-- --------------------------------------------------------------------------
-- 6. Comments
-- --------------------------------------------------------------------------
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  recognition_id  uuid not null references public.recognitions(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_comment_not_empty check (char_length(trim(body)) > 0)
);

comment on table public.comments is
  'Threaded comments on recognitions.';

create index idx_comments_recognition
  on public.comments(recognition_id, created_at asc);

create trigger comments_updated_at
  before update on public.comments
  for each row execute function moddatetime(updated_at);

-- Trigger: increment/decrement denormalized comment_count on recognitions
create or replace function public.update_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.recognitions
    set comment_count = comment_count + 1
    where id = new.recognition_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.recognitions
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.recognition_id;
    return old;
  end if;
end;
$$;

create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute function public.update_comment_count();
