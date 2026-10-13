-- Generic sync store for FORGE's local-first Dexie tables.
-- Each Dexie row is stored as JSON under (user_id, table_name, id).
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

create table if not exists public.app_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, table_name, id)
);

alter table public.app_records enable row level security;

drop policy if exists "own records read" on public.app_records;
create policy "own records read"
  on public.app_records for select
  using (auth.uid() = user_id);

drop policy if exists "own records write" on public.app_records;
create policy "own records write"
  on public.app_records for insert
  with check (auth.uid() = user_id);

drop policy if exists "own records update" on public.app_records;
create policy "own records update"
  on public.app_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own records delete" on public.app_records;
create policy "own records delete"
  on public.app_records for delete
  using (auth.uid() = user_id);

-- Progress photo storage bucket + policies.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read"
  on storage.objects for select
  using (bucket_id = 'progress-photos' and owner = auth.uid());

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write"
  on storage.objects for insert
  with check (bucket_id = 'progress-photos' and owner = auth.uid());

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete"
  on storage.objects for delete
  using (bucket_id = 'progress-photos' and owner = auth.uid());
