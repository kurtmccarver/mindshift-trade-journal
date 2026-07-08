create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  community text,
  heard_from text,
  feedback text not null,
  page_url text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback service role only" on public.feedback;
create policy "feedback service role only"
on public.feedback
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
