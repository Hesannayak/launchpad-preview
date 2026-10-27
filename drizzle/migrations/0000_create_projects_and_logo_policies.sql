create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  slug text not null unique,
  tagline text not null,
  description text not null,
  website_url text,
  x_url text,
  dev_x_url text,
  launch_date date,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_launch_date_idx on public.projects (launch_date asc nulls last, created_at desc);

grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

alter table public.projects enable row level security;

create policy "Anyone can view listed projects"
  on public.projects for select
  using (true);

create policy "Users can list their own projects"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update their projects"
  on public.projects for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their projects"
  on public.projects for delete
  to authenticated
  using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create policy "Public read project logos"
  on storage.objects for select
  using (bucket_id = 'project-logos');

create policy "Users upload logos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update logos in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete logos in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );