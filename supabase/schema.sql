create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type public.user_type as enum ('student', 'applicant', 'freshman');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_scope') then
    create type public.content_scope as enum ('school', 'global');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_category') then
    create type public.post_category as enum ('admission', 'community', 'dating');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_subcategory') then
    create type public.post_subcategory as enum ('club', 'meetup', 'food', 'advice', 'hot', 'freshman', 'dating', 'meeting', 'anonymous');
  end if;
  if not exists (select 1 from pg_type where typname = 'visibility_level') then
    create type public.visibility_level as enum ('anonymous', 'school', 'schoolDepartment', 'profile');
  end if;
  if not exists (select 1 from pg_type where typname = 'student_verification_status') then
    create type public.student_verification_status as enum ('none', 'unverified', 'pending', 'verified', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'verification_request_status') then
    create type public.verification_request_status as enum ('pending', 'verified', 'expired', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'difficulty_level') then
    create type public.difficulty_level as enum ('easy', 'medium', 'hard');
  end if;
  if not exists (select 1 from pg_type where typname = 'workload_level') then
    create type public.workload_level as enum ('light', 'medium', 'heavy');
  end if;
  if not exists (select 1 from pg_type where typname = 'attendance_level') then
    create type public.attendance_level as enum ('flexible', 'medium', 'strict');
  end if;
  if not exists (select 1 from pg_type where typname = 'exam_style_type') then
    create type public.exam_style_type as enum ('multipleChoice', 'essay', 'project', 'mixed');
  end if;
  if not exists (select 1 from pg_type where typname = 'grading_style_type') then
    create type public.grading_style_type as enum ('tough', 'medium', 'generous');
  end if;
  if not exists (select 1 from pg_type where typname = 'trade_post_status') then
    create type public.trade_post_status as enum ('open', 'matched', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_target_type') then
    create type public.report_target_type as enum ('post', 'comment', 'review', 'profile', 'user');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_reason') then
    create type public.report_reason as enum ('misinformation', 'abuse', 'spam', 'harassment', 'fraud', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('pending', 'reviewed', 'reviewing', 'confirmed', 'dismissed');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum ('comment', 'answer', 'trade', 'report');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_owner_type') then
    create type public.media_owner_type as enum ('post', 'profile');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type public.media_type as enum ('image', 'video');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator');
  end if;
end
$$;

do $$
begin
  alter type public.user_type add value if not exists 'applicant';
  alter type public.user_type add value if not exists 'freshman';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type public.post_subcategory add value if not exists 'advice';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type public.notification_type add value if not exists 'reply';
  alter type public.notification_type add value if not exists 'trending_post';
  alter type public.notification_type add value if not exists 'lecture_reaction';
  alter type public.notification_type add value if not exists 'trade_match';
  alter type public.notification_type add value if not exists 'admission_answer';
  alter type public.notification_type add value if not exists 'school_recommendation';
  alter type public.notification_type add value if not exists 'freshman_trending';
  alter type public.notification_type add value if not exists 'admission_unanswered';
  alter type public.notification_type add value if not exists 'verification_approved';
  alter type public.notification_type add value if not exists 'report_update';
  alter type public.notification_type add value if not exists 'announcement';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type public.post_subcategory add value if not exists 'freshman';
exception
  when duplicate_object then null;
end
$$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain citext not null unique,
  city text not null default '서울',
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.generate_user_nickname(
  p_user_id uuid,
  p_school_id uuid default null
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  school_code text := 'ANON';
begin
  if p_school_id is not null then
    select upper(left(regexp_replace(coalesce(domain, name, 'anon'), '[^a-zA-Z]', '', 'g'), 3))
      into school_code
    from public.schools
    where id = p_school_id;
  end if;

  school_code := coalesce(nullif(school_code, ''), 'ANON');
  return school_code || '_익명_' || upper(substr(replace(p_user_id::text, '-', ''), 1, 4));
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  user_type public.user_type not null default 'student',
  school_id uuid references public.schools(id) on delete set null,
  department text,
  grade integer,
  nickname text not null unique,
  trust_score integer not null default 0,
  report_count integer not null default 0,
  warning_count integer not null default 0,
  is_restricted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  name text,
  verified boolean not null default false,
  adult_verified boolean not null default false,
  adult_verified_at timestamptz,
  student_verification_status public.student_verification_status not null default 'unverified',
  school_email citext,
  school_email_verified_at timestamptz,
  default_visibility_level public.visibility_level not null default 'school',
  bio text,
  avatar_url text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint users_grade_check check (grade is null or grade between 1 and 12)
);

alter table public.users
  add column if not exists student_verification_status public.student_verification_status not null default 'unverified';

alter table public.users
  add column if not exists school_email citext;

alter table public.users
  add column if not exists school_email_verified_at timestamptz;

alter table public.users
  add column if not exists adult_verified boolean not null default false;

alter table public.users
  add column if not exists adult_verified_at timestamptz;

update public.users
set user_type = 'applicant'
where user_type::text = 'highschool';

update public.users
set user_type = 'applicant'
where user_type::text not in ('student', 'applicant', 'freshman');

update public.users
set school_email = lower(email::text)::citext
where user_type = 'student'
  and school_email is null
  and exists (
    select 1
    from public.schools
    where id = users.school_id
      and split_part(lower(users.email::text), '@', 2) = lower(domain::text)
  );

update public.users
set student_verification_status = case
  when user_type <> 'student' then 'none'::public.student_verification_status
  when verified then 'verified'::public.student_verification_status
  when school_email is not null then 'pending'::public.student_verification_status
  else 'unverified'::public.student_verification_status
end
where student_verification_status is null
   or student_verification_status = 'none'
   or student_verification_status = 'unverified';

update public.users
set school_email_verified_at = coalesce(school_email_verified_at, created_at)
where student_verification_status = 'verified'
  and school_email_verified_at is null;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  role public.app_role not null default 'moderator',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  school_email citext not null,
  verification_user_id uuid,
  status public.verification_request_status not null default 'pending',
  delivery_method text not null default 'pending',
  delivery_status text not null default 'pending',
  delivery_error text,
  delivered_at timestamptz,
  next_path text not null default '/home',
  requested_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '1 day')
);

alter table public.student_verification_requests
  add column if not exists verification_user_id uuid;
alter table public.student_verification_requests
  add column if not exists delivery_method text not null default 'pending';
alter table public.student_verification_requests
  add column if not exists delivery_status text not null default 'pending';
alter table public.student_verification_requests
  add column if not exists delivery_error text;
alter table public.student_verification_requests
  add column if not exists delivered_at timestamptz;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  category public.post_category not null,
  subcategory public.post_subcategory,
  title text not null,
  content text not null,
  school_id uuid references public.schools(id) on delete set null,
  scope public.content_scope not null default 'global',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  report_count integer not null default 0,
  auto_hidden boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  visibility_level public.visibility_level not null default 'school',
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_title_check check (length(trim(title)) > 0),
  constraint posts_content_check check (length(trim(content)) > 0),
  constraint posts_scope_school_check check (
    (scope = 'global') or (school_id is not null)
  )
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  like_count integer not null default 0,
  report_count integer not null default 0,
  auto_hidden boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  accepted boolean not null default false,
  visibility_level public.visibility_level not null default 'school',
  constraint comments_content_check check (length(trim(content)) > 0)
);

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  professor text not null,
  section text not null default '01',
  semester text not null,
  created_at timestamptz not null default timezone('utc', now()),
  day_time text not null default '',
  credits integer not null default 3,
  department text not null default '전공'
);

create table if not exists public.lecture_reviews (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  difficulty public.difficulty_level not null,
  workload public.workload_level not null,
  attendance public.attendance_level not null,
  exam_style public.exam_style_type not null,
  team_project boolean not null default false,
  grading_style public.grading_style_type not null,
  honey_score integer not null,
  short_comment text not null,
  long_comment text not null,
  semester text not null,
  report_count integer not null default 0,
  auto_hidden boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  presentation boolean not null default false,
  helpful_count integer not null default 0,
  visibility_level public.visibility_level not null default 'school',
  constraint lecture_reviews_short_comment_check check (length(trim(short_comment)) >= 5),
  constraint lecture_reviews_long_comment_check check (length(trim(long_comment)) >= 20),
  constraint lecture_reviews_honey_score_check check (honey_score between 0 and 100),
  constraint lecture_reviews_unique_semester unique (lecture_id, author_id, semester)
);

create table if not exists public.trade_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  have_lecture_id uuid not null references public.lectures(id) on delete cascade,
  want_lecture_id uuid not null references public.lectures(id) on delete cascade,
  note text not null default '',
  status public.trade_post_status not null default 'open',
  report_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  semester text not null default '',
  professor text,
  section text,
  time_range text not null default '',
  visibility_level public.visibility_level not null default 'school',
  auto_hidden boolean not null default false
);

create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_post_id uuid not null references public.trade_posts(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dating_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  department text,
  grade integer not null,
  intro text not null,
  vibe_tag text not null,
  photo_url text,
  visibility_level public.visibility_level not null default 'profile',
  report_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  auto_hidden boolean not null default false,
  is_visible boolean not null default true,
  constraint dating_profiles_grade_check check (grade between 1 and 6)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null default 'other',
  memo text,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  constraint reports_unique_target unique (reporter_id, target_type, target_id)
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint blocks_unique_pair unique (blocker_id, blocked_user_id),
  constraint blocks_self_check check (blocker_id <> blocked_user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications
  add column if not exists href text,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists source_kind text not null default 'activity',
  add column if not exists delivery_mode text not null default 'instant',
  add column if not exists read_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_source_kind_check'
  ) then
    alter table public.notifications
      add constraint notifications_source_kind_check
      check (source_kind in ('activity', 'recommendation', 'system'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_delivery_mode_check'
  ) then
    alter table public.notifications
      add constraint notifications_delivery_mode_check
      check (delivery_mode in ('instant', 'daily'));
  end if;
end $$;

alter type public.post_subcategory add value if not exists 'free';
alter type public.post_subcategory add value if not exists 'ask';
alter type public.post_subcategory add value if not exists 'school';
alter type public.post_subcategory add value if not exists 'anonymous';

alter table public.users alter column default_visibility_level set default 'school';
alter table public.posts alter column visibility_level set default 'school';
alter table public.comments alter column visibility_level set default 'school';
alter table public.lecture_reviews alter column visibility_level set default 'school';

update public.users
set default_visibility_level = case
  when user_type = 'student' and school_id is not null then 'schoolDepartment'::public.visibility_level
  when school_id is not null then 'school'::public.visibility_level
  else 'school'::public.visibility_level
end
where default_visibility_level = 'anonymous'::public.visibility_level;

update public.posts
set visibility_level = 'school'::public.visibility_level
where visibility_level = 'anonymous'::public.visibility_level
  and not (
    category = 'community'
    and subcategory = 'anonymous'::public.post_subcategory
  );

update public.comments c
set visibility_level = 'school'::public.visibility_level
from public.posts p
where c.post_id = p.id
  and c.visibility_level = 'anonymous'::public.visibility_level
  and not (
    p.category = 'community'
    and p.subcategory = 'anonymous'::public.post_subcategory
  );

update public.lecture_reviews
set visibility_level = 'school'::public.visibility_level
where visibility_level = 'anonymous'::public.visibility_level;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_type public.media_owner_type not null,
  owner_id uuid not null,
  file_url text not null,
  media_type public.media_type not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ops_events (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  event text not null,
  source text not null default 'app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ops_events_level_check check (level in ('info', 'warn', 'error'))
);

create index if not exists idx_posts_school_id on public.posts (school_id);
create index if not exists idx_posts_scope on public.posts (scope);
create index if not exists idx_posts_author_created_at on public.posts (author_id, created_at desc);
create index if not exists idx_student_verification_requests_user_status on public.student_verification_requests (user_id, status, requested_at desc);
create unique index if not exists idx_users_verified_school_email on public.users (school_email) where school_email is not null and student_verification_status = 'verified';
create index if not exists idx_comments_post_id on public.comments (post_id);
create index if not exists idx_comments_author_created_at on public.comments (author_id, created_at desc);
create index if not exists idx_lecture_reviews_lecture_id on public.lecture_reviews (lecture_id);
create index if not exists idx_lecture_reviews_author_semester on public.lecture_reviews (author_id, semester);
create index if not exists idx_lecture_reviews_author_created_at on public.lecture_reviews (author_id, created_at desc);
create index if not exists idx_trade_posts_school_status on public.trade_posts (school_id, status);
create index if not exists idx_trade_posts_author_created_at on public.trade_posts (author_id, created_at desc);
create index if not exists idx_trade_messages_trade_post_created_at on public.trade_messages (trade_post_id, created_at desc);
create index if not exists idx_reports_target on public.reports (target_type, target_id);
create index if not exists idx_reports_reporter_created_at on public.reports (reporter_id, created_at desc);
create index if not exists idx_notifications_user_created_at on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_source_created_at on public.notifications (user_id, source_kind, created_at desc);
create index if not exists idx_media_assets_owner on public.media_assets (owner_type, owner_id);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs (created_at desc);
create index if not exists idx_admin_audit_logs_target on public.admin_audit_logs (target_type, target_id);
create index if not exists idx_ops_events_created_at on public.ops_events (created_at desc);
create index if not exists idx_ops_events_level_created_at on public.ops_events (level, created_at desc);

create or replace function public.set_user_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor_can_override boolean := auth.uid() is null or public.is_admin();
begin
  if new.school_email is not null then
    new.school_email := lower(btrim(new.school_email::text))::citext;
  end if;

  if new.nickname is null or btrim(new.nickname) = '' then
    new.nickname := public.generate_user_nickname(new.id, new.school_id);
  end if;

  if new.default_visibility_level is null
    or new.default_visibility_level = 'anonymous'::public.visibility_level then
    new.default_visibility_level := case
      when new.user_type = 'student' and new.school_id is not null then 'schoolDepartment'::public.visibility_level
      when new.user_type = 'freshman' and new.school_id is not null then 'school'::public.visibility_level
      when new.user_type = 'applicant' and new.school_id is not null then 'school'::public.visibility_level
      else 'school'::public.visibility_level
    end;
  end if;

  if new.user_type <> 'student' then
    new.student_verification_status := 'none';
    new.school_email_verified_at := null;
    new.verified := false;
    return new;
  end if;

  if new.student_verification_status is null or new.student_verification_status = 'none' then
    new.student_verification_status := case
      when new.school_email is not null then 'pending'::public.student_verification_status
      else 'unverified'::public.student_verification_status
    end;
  end if;

  if new.school_email is not null and new.school_id is not null and not exists (
    select 1
    from public.schools
    where id = new.school_id
      and split_part(lower(new.school_email::text), '@', 2) = lower(domain::text)
  ) then
    raise exception '학교 메일 도메인이 학교 정보와 일치하지 않습니다.';
  end if;

  if new.student_verification_status = 'verified' and not actor_can_override then
    new.student_verification_status := case
      when new.school_email is not null then 'pending'::public.student_verification_status
      else 'unverified'::public.student_verification_status
    end;
  end if;

  if new.student_verification_status = 'verified' then
    new.school_email_verified_at := coalesce(new.school_email_verified_at, timezone('utc', now()));
    new.verified := true;
  else
    new.school_email_verified_at := null;
    new.verified := false;
  end if;

  return new;
end;
$$;

drop trigger if exists users_set_defaults on public.users;
create trigger users_set_defaults
before insert or update on public.users
for each row
execute function public.set_user_defaults();

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.update_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.update_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    nickname,
    created_at
  )
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data ->> 'email', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    public.generate_user_nickname(new.id, null),
    coalesce(new.created_at, timezone('utc', now()))
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.users.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create or replace function public.current_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id
  from public.users
  where id = auth.uid()
$$;

create or replace function public.current_user_type()
returns public.user_type
language sql
stable
security definer
set search_path = public
as $$
  select user_type
  from public.users
  where id = auth.uid()
$$;

create or replace function public.current_student_verification_status()
returns public.student_verification_status
language sql
stable
security definer
set search_path = public
as $$
  select student_verification_status
  from public.users
  where id = auth.uid()
$$;

create or replace function public.current_auth_email()
returns citext
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(email)::citext
  from auth.users
  where id = auth.uid()
$$;

create or replace function public.is_current_auth_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  )
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_type() = 'student', false)
$$;

create or replace function public.can_self_verify_student(
  p_school_id uuid,
  p_school_email citext
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.schools
    where id = p_school_id
      and p_school_email is not null
      and lower(p_school_email::text) = lower(public.current_auth_email()::text)
      and split_part(lower(p_school_email::text), '@', 2) = lower(domain::text)
      and public.is_current_auth_email_confirmed()
  )
$$;

create or replace function public.is_verified_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_type() = 'student'
    and public.current_student_verification_status() = 'verified',
    false
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  )
$$;

create or replace function public.can_read_post(
  p_scope public.content_scope,
  p_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_scope = 'global' then true
    when auth.uid() is null then false
    else public.current_user_school_id() = p_school_id
  end
$$;

create or replace function public.can_read_post_by_id(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.posts
    where id = p_post_id
      and public.can_read_post(scope, school_id)
  )
$$;

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  if target_post_id is null then
    return null;
  end if;

  update public.posts
  set comment_count = (
    select count(*)
    from public.comments
    where post_id = target_post_id
  )
  where id = target_post_id;

  return null;
end;
$$;

drop trigger if exists comments_sync_post_count on public.comments;
create trigger comments_sync_post_count
after insert or update or delete on public.comments
for each row
execute function public.sync_post_comment_count();

create or replace function public.resolve_report_target_user_id(
  p_target_type public.report_target_type,
  p_target_id uuid
)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  result_id uuid;
begin
  if p_target_type = 'user' then
    return p_target_id;
  end if;

  if p_target_type = 'post' then
    select author_id into result_id from public.posts where id = p_target_id;
    return result_id;
  end if;

  if p_target_type = 'comment' then
    select author_id into result_id from public.comments where id = p_target_id;
    return result_id;
  end if;

  if p_target_type = 'review' then
    select author_id into result_id from public.lecture_reviews where id = p_target_id;
    return result_id;
  end if;

  select user_id into result_id from public.dating_profiles where id = p_target_id;
  return result_id;
end;
$$;

create or replace function public.refresh_target_report_state(
  p_target_type public.report_target_type,
  p_target_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  active_count integer := 0;
  target_user_id uuid;
begin
  if p_target_type is null or p_target_id is null then
    return;
  end if;

  select count(*)
    into active_count
  from public.reports
  where target_type = p_target_type
    and target_id = p_target_id
    and status <> 'dismissed';

  if p_target_type = 'post' then
    update public.posts
    set report_count = active_count,
        auto_hidden = active_count >= 3
    where id = p_target_id;
  elsif p_target_type = 'comment' then
    update public.comments
    set report_count = active_count,
        auto_hidden = active_count >= 3
    where id = p_target_id;
  elsif p_target_type = 'review' then
    update public.lecture_reviews
    set report_count = active_count,
        auto_hidden = active_count >= 3
    where id = p_target_id;
  elsif p_target_type = 'profile' then
    update public.dating_profiles
    set report_count = active_count,
        auto_hidden = active_count >= 3
    where id = p_target_id;
  end if;

  target_user_id := public.resolve_report_target_user_id(p_target_type, p_target_id);

  if target_user_id is not null then
    update public.users
    set report_count = (
      select count(*)
      from public.reports r
      where r.status <> 'dismissed'
        and public.resolve_report_target_user_id(r.target_type, r.target_id) = target_user_id
    )
    where id = target_user_id;
  end if;
end;
$$;

create or replace function public.apply_report_side_effects()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_target_report_state(old.target_type, old.target_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_target_report_state(new.target_type, new.target_id);
  end if;

  return null;
end;
$$;

drop trigger if exists reports_apply_side_effects on public.reports;
create trigger reports_apply_side_effects
after insert or update or delete on public.reports
for each row
execute function public.apply_report_side_effects();

create or replace function public.sync_post_media_asset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.media_assets
  where owner_type = 'post'
    and owner_id = coalesce(new.id, old.id)
    and media_type = 'image';

  if tg_op <> 'DELETE' and new.image_url is not null and length(trim(new.image_url)) > 0 then
    insert into public.media_assets (owner_type, owner_id, media_type, file_url)
    values ('post', new.id, 'image', new.image_url);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_sync_media_assets on public.posts;
create trigger posts_sync_media_assets
after insert or update of image_url or delete on public.posts
for each row
execute function public.sync_post_media_asset();

create or replace function public.sync_profile_media_asset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.media_assets
  where owner_type = 'profile'
    and owner_id = coalesce(new.id, old.id)
    and media_type = 'image';

  if tg_op <> 'DELETE' and new.photo_url is not null and length(trim(new.photo_url)) > 0 then
    insert into public.media_assets (owner_type, owner_id, media_type, file_url)
    values ('profile', new.id, 'image', new.photo_url);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists dating_profiles_sync_media_assets on public.dating_profiles;
create trigger dating_profiles_sync_media_assets
after insert or update of photo_url or delete on public.dating_profiles
for each row
execute function public.sync_profile_media_asset();

drop function if exists public.list_user_public_profiles();
create function public.list_user_public_profiles()
returns table (
  id uuid,
  email text,
  name text,
  nickname text,
  user_type public.user_type,
  school_id uuid,
  department text,
  grade integer,
  verified boolean,
  student_verification_status public.student_verification_status,
  trust_score integer,
  report_count integer,
  warning_count integer,
  is_restricted boolean,
  default_visibility_level public.visibility_level,
  created_at timestamptz,
  bio text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    null::text as email,
    u.name,
    u.nickname,
    u.user_type,
    u.school_id,
    u.department,
    u.grade,
    u.verified,
    u.student_verification_status,
    u.trust_score,
    u.report_count,
    u.warning_count,
    u.is_restricted,
    u.default_visibility_level,
    u.created_at,
    u.bio,
    u.avatar_url
  from public.users u
$$;

grant execute on function public.list_user_public_profiles() to anon, authenticated;
grant execute on function public.current_user_school_id() to authenticated;
grant execute on function public.current_user_type() to authenticated;
grant execute on function public.current_student_verification_status() to authenticated;
grant execute on function public.is_student() to authenticated;
grant execute on function public.is_verified_student() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.student_verification_requests enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_reviews enable row level security;
alter table public.trade_posts enable row level security;
alter table public.trade_messages enable row level security;
alter table public.dating_profiles enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;
alter table public.media_assets enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.ops_events enable row level security;

drop policy if exists "schools read" on public.schools;
create policy "schools read"
on public.schools
for select
to anon, authenticated
using (true);

drop policy if exists "schools admin write" on public.schools;
create policy "schools admin write"
on public.schools
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users self read" on public.users;
create policy "users self read"
on public.users
for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "users self insert" on public.users;
create policy "users self insert"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users self update" on public.users;
create policy "users self update"
on public.users
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "user_roles self or admin read" on public.user_roles;
create policy "user_roles self or admin read"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_roles admin manage" on public.user_roles;
create policy "user_roles admin manage"
on public.user_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "student verification requests own read" on public.student_verification_requests;
create policy "student verification requests own read"
on public.student_verification_requests
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "student verification requests own insert" on public.student_verification_requests;
create policy "student verification requests own insert"
on public.student_verification_requests
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "student verification requests admin update" on public.student_verification_requests;
create policy "student verification requests admin update"
on public.student_verification_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "posts read by scope" on public.posts;
create policy "posts read by scope"
on public.posts
for select
to anon, authenticated
using (
  not auto_hidden
  and public.can_read_post(scope, school_id)
  and (category <> 'dating' or public.is_verified_student())
);

drop policy if exists "posts insert own" on public.posts;
create policy "posts insert own"
on public.posts
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (select 1 from public.users where id = auth.uid() and not is_restricted)
  and (category <> 'dating' or public.is_verified_student())
  and (
    scope = 'global'
    or school_id = public.current_user_school_id()
  )
  and (
    subcategory is distinct from 'freshman'
    or (
      public.current_user_type() = 'freshman'
      and scope = 'school'
      and school_id = public.current_user_school_id()
    )
  )
);

drop policy if exists "posts update own" on public.posts;
create policy "posts update own"
on public.posts
for update
to authenticated
using (auth.uid() = author_id or public.is_admin())
with check (auth.uid() = author_id or public.is_admin());

drop policy if exists "posts delete own" on public.posts;
create policy "posts delete own"
on public.posts
for delete
to authenticated
using (auth.uid() = author_id or public.is_admin());

drop policy if exists "comments read via post" on public.comments;
create policy "comments read via post"
on public.comments
for select
to anon, authenticated
using (
  not auto_hidden
  and public.can_read_post_by_id(post_id)
);

drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own"
on public.comments
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (select 1 from public.users where id = auth.uid() and not is_restricted)
  and public.can_read_post_by_id(post_id)
  and not exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.subcategory = 'freshman'
      and (
        public.current_user_type() <> 'freshman'
        or posts.school_id is distinct from public.current_user_school_id()
      )
  )
);

drop policy if exists "comments update own" on public.comments;
create policy "comments update own"
on public.comments
for update
to authenticated
using (
  auth.uid() = author_id
  or public.is_admin()
  or exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.author_id = auth.uid()
  )
)
with check (
  auth.uid() = author_id
  or public.is_admin()
  or exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.author_id = auth.uid()
  )
);

drop policy if exists "comments delete own" on public.comments;
create policy "comments delete own"
on public.comments
for delete
to authenticated
using (auth.uid() = author_id or public.is_admin());

drop policy if exists "lectures read" on public.lectures;
create policy "lectures read"
on public.lectures
for select
to anon, authenticated
using (true);

drop policy if exists "lectures admin manage" on public.lectures;
create policy "lectures admin manage"
on public.lectures
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "lecture_reviews read" on public.lecture_reviews;
create policy "lecture_reviews read"
on public.lecture_reviews
for select
to anon, authenticated
using (not auto_hidden);

drop policy if exists "lecture_reviews insert own" on public.lecture_reviews;
create policy "lecture_reviews insert own"
on public.lecture_reviews
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (select 1 from public.users where id = auth.uid() and not is_restricted)
  and public.is_verified_student()
);

drop policy if exists "lecture_reviews update own" on public.lecture_reviews;
create policy "lecture_reviews update own"
on public.lecture_reviews
for update
to authenticated
using (auth.uid() = author_id or public.is_admin())
with check (auth.uid() = author_id or public.is_admin());

drop policy if exists "lecture_reviews delete own" on public.lecture_reviews;
create policy "lecture_reviews delete own"
on public.lecture_reviews
for delete
to authenticated
using (auth.uid() = author_id or public.is_admin());

drop policy if exists "trade_posts read same school" on public.trade_posts;
create policy "trade_posts read same school"
on public.trade_posts
for select
to authenticated
using (
  not auto_hidden
  and public.is_verified_student()
  and (
    auth.uid() = author_id
    or school_id = public.current_user_school_id()
  )
);

drop policy if exists "trade_posts insert student" on public.trade_posts;
create policy "trade_posts insert student"
on public.trade_posts
for insert
to authenticated
with check (
  auth.uid() = author_id
  and public.is_verified_student()
  and school_id = public.current_user_school_id()
  and exists (select 1 from public.users where id = auth.uid() and not is_restricted)
);

drop policy if exists "trade_posts update own" on public.trade_posts;
create policy "trade_posts update own"
on public.trade_posts
for update
to authenticated
using (auth.uid() = author_id or public.is_admin())
with check (auth.uid() = author_id or public.is_admin());

drop policy if exists "trade_posts delete own" on public.trade_posts;
create policy "trade_posts delete own"
on public.trade_posts
for delete
to authenticated
using (auth.uid() = author_id or public.is_admin());

drop policy if exists "trade_messages same school read" on public.trade_messages;
create policy "trade_messages same school read"
on public.trade_messages
for select
to authenticated
using (
  auth.uid() = sender_id
  or exists (
    select 1
    from public.trade_posts trade_post
    where trade_post.id = trade_post_id
      and (
        trade_post.author_id = auth.uid()
        or trade_post.school_id = public.current_user_school_id()
      )
  )
);

drop policy if exists "trade_messages verified student insert" on public.trade_messages;
create policy "trade_messages verified student insert"
on public.trade_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_verified_student()
  and exists (
    select 1
    from public.trade_posts trade_post
    where trade_post.id = trade_post_id
      and trade_post.school_id = public.current_user_school_id()
  )
);

drop policy if exists "dating_profiles student read" on public.dating_profiles;
create policy "dating_profiles student read"
on public.dating_profiles
for select
to authenticated
using (
  public.is_verified_student()
  and is_visible
  and not auto_hidden
);

drop policy if exists "dating_profiles student insert" on public.dating_profiles;
create policy "dating_profiles student insert"
on public.dating_profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_verified_student()
  and school_id = public.current_user_school_id()
  and exists (select 1 from public.users where id = auth.uid() and not is_restricted)
);

drop policy if exists "dating_profiles update own" on public.dating_profiles;
create policy "dating_profiles update own"
on public.dating_profiles
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "dating_profiles delete own" on public.dating_profiles;
create policy "dating_profiles delete own"
on public.dating_profiles
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports self or admin read" on public.reports;
create policy "reports self or admin read"
on public.reports
for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own"
on public.reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and exists (select 1 from public.users where id = auth.uid() and not is_restricted)
);

drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update"
on public.reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "reports admin delete" on public.reports;
create policy "reports admin delete"
on public.reports
for delete
to authenticated
using (public.is_admin());

drop policy if exists "blocks own read" on public.blocks;
create policy "blocks own read"
on public.blocks
for select
to authenticated
using (blocker_id = auth.uid());

drop policy if exists "blocks own insert" on public.blocks;
create policy "blocks own insert"
on public.blocks
for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists "blocks own delete" on public.blocks;
create policy "blocks own delete"
on public.blocks
for delete
to authenticated
using (blocker_id = auth.uid());

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications admin insert" on public.notifications;
create policy "notifications admin insert"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "media_assets read" on public.media_assets;
create policy "media_assets read"
on public.media_assets
for select
to anon, authenticated
using (true);

drop policy if exists "media_assets authenticated insert" on public.media_assets;
create policy "media_assets authenticated insert"
on public.media_assets
for insert
to authenticated
with check (true);

drop policy if exists "media_assets owner delete" on public.media_assets;
create policy "media_assets owner delete"
on public.media_assets
for delete
to authenticated
using (
  public.is_admin()
  or (
    owner_type = 'post'
    and exists (
      select 1
      from public.posts
      where posts.id = media_assets.owner_id
        and posts.author_id = auth.uid()
    )
  )
  or (
    owner_type = 'profile'
    and exists (
      select 1
      from public.dating_profiles
      where dating_profiles.id = media_assets.owner_id
        and dating_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "admin audit logs read" on public.admin_audit_logs;
create policy "admin audit logs read"
on public.admin_audit_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin audit logs insert" on public.admin_audit_logs;
create policy "admin audit logs insert"
on public.admin_audit_logs
for insert
to authenticated
with check (public.is_admin() and auth.uid() = admin_user_id);

drop policy if exists "ops events read" on public.ops_events;
create policy "ops events read"
on public.ops_events
for select
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

do $$
begin
  begin
    execute 'alter table storage.objects enable row level security';
    execute 'drop policy if exists "media public read" on storage.objects';
    execute 'create policy "media public read" on storage.objects for select to public using (bucket_id = ''media'')';
    execute 'drop policy if exists "media authenticated insert" on storage.objects';
    execute 'create policy "media authenticated insert" on storage.objects for insert to authenticated with check (bucket_id = ''media'' and (((storage.foldername(name))[1] = ''posts'' and (storage.foldername(name))[2] = auth.uid()::text) or ((storage.foldername(name))[1] = ''profiles'' and (storage.foldername(name))[2] = auth.uid()::text)))';
    execute 'drop policy if exists "media authenticated update" on storage.objects';
    execute 'create policy "media authenticated update" on storage.objects for update to authenticated using (bucket_id = ''media'' and (((storage.foldername(name))[1] = ''posts'' and (storage.foldername(name))[2] = auth.uid()::text) or ((storage.foldername(name))[1] = ''profiles'' and (storage.foldername(name))[2] = auth.uid()::text))) with check (bucket_id = ''media'' and (((storage.foldername(name))[1] = ''posts'' and (storage.foldername(name))[2] = auth.uid()::text) or ((storage.foldername(name))[1] = ''profiles'' and (storage.foldername(name))[2] = auth.uid()::text)))';
    execute 'drop policy if exists "media authenticated delete" on storage.objects';
    execute 'create policy "media authenticated delete" on storage.objects for delete to authenticated using (bucket_id = ''media'' and (((storage.foldername(name))[1] = ''posts'' and (storage.foldername(name))[2] = auth.uid()::text) or ((storage.foldername(name))[1] = ''profiles'' and (storage.foldername(name))[2] = auth.uid()::text)))';
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage.objects policy setup due to insufficient privilege';
  end;
end
$$;

notify pgrst, 'reload schema';
