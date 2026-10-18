-- Multas AI initial schema. Apply with Supabase CLI after configuring the project.
create extension if not exists pgcrypto;

create type public.appeal_status as enum (
  'pending_payment',
  'processing_ai',
  'pending_specialist_review',
  'completed_sent',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'approved',
  'failed',
  'refunded'
);

create table public.infractions (
  code text primary key,
  description text not null,
  severity text not null check (severity in ('leve', 'media', 'grave', 'gravissima')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.justifications (
  id uuid primary key default gen_random_uuid(),
  infraction_code text references public.infractions(code) on delete cascade,
  title text not null,
  prompt_template text not null,
  is_standard boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  infraction_code text not null references public.infractions(code),
  justification_id uuid references public.justifications(id) on delete set null,
  reason_title text not null,
  specialist_review_requested boolean not null default false,
  incident_description text,
  incident_date date not null,
  incident_time time not null,
  authority text not null,
  state_code char(2) not null,
  city text not null,
  driver_data jsonb not null,
  vehicle_data jsonb not null,
  attachment_front_path text,
  attachment_back_path text,
  customer_email text not null,
  status public.appeal_status not null default 'pending_payment',
  pdf_url text,
  ai_draft text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid references public.appeals(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status public.payment_status not null default 'pending',
  gateway_id text unique,
  provider text not null,
  method text not null check (method in ('pix', 'card')),
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'BRL',
  coupon_code text,
  installments smallint not null default 1 check (installments between 1 and 3),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.infractions enable row level security;
alter table public.justifications enable row level security;
alter table public.appeals enable row level security;
alter table public.payments enable row level security;

-- Public users may read only active catalog entries. Writes to appeals/payments
-- must be performed by authenticated, policy-protected server actions/webhooks.
create policy "Read active infractions" on public.infractions
  for select using (active = true);
create policy "Read active justifications" on public.justifications
  for select using (active = true);

create policy "Users read own appeals" on public.appeals
  for select to authenticated using (auth.uid() = user_id);
create policy "Users read own payments" on public.payments
  for select to authenticated using (auth.uid() = user_id);

create index appeals_status_created_idx on public.appeals(status, created_at desc);
create index appeals_user_id_idx on public.appeals(user_id);
create index payments_appeal_id_idx on public.payments(appeal_id);
