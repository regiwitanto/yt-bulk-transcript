-- =============================================
-- YouTube Bulk Transcript — Supabase SQL Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Profiles: one row per authenticated user
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  is_supporter boolean not null default false
);

-- Auto-create a profile row on new sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Playlists
create type playlist_status as enum ('pending', 'processing', 'completed');

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  title text not null,
  status playlist_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Videos
create type video_status as enum ('queued', 'processing', 'success', 'no_transcript', 'error');

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  yt_video_id text not null,
  title text not null,
  transcript text,
  status video_status not null default 'queued',
  retry_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security: users can only see their own data
alter table profiles enable row level security;
alter table playlists enable row level security;
alter table videos enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can read own playlists"
  on playlists for select using (auth.uid() = user_id);

create policy "Users can insert own playlists"
  on playlists for insert with check (auth.uid() = user_id);

create policy "Users can update own playlists"
  on playlists for update using (auth.uid() = user_id);

create policy "Users can read own videos"
  on videos for select using (
    exists (select 1 from playlists where playlists.id = videos.playlist_id and playlists.user_id = auth.uid())
  );

create policy "Users can insert own videos"
  on videos for insert with check (
    exists (select 1 from playlists where playlists.id = videos.playlist_id and playlists.user_id = auth.uid())
  );

create policy "Users can update own videos"
  on videos for update using (
    exists (select 1 from playlists where playlists.id = videos.playlist_id and playlists.user_id = auth.uid())
  );
