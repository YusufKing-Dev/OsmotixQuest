-- Osmotix 30-Day Quest: run this whole file once in the Supabase SQL editor.
-- All access goes through the server with the service role key. RLS is enabled
-- with no policies, so the public anon key can read nothing.

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  x_handle text not null unique,
  telegram_username text,
  access_code_hash text,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists quests (
  id int primary key,
  title text not null,
  description text not null,
  channel text not null,
  points int not null check (points >= 0),
  kind text not null check (kind in ('link', 'text', 'username')),
  opens_at timestamptz,
  closes_at timestamptz,
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  quest_id int not null references quests(id),
  evidence text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Appealed')),
  verification_method text not null default 'manual',
  points_awarded int not null default 0,
  rejection_reason text,
  reviewer_id uuid,
  appeal_status text check (appeal_status in ('Open', 'Closed')),
  appeal_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (participant_id, quest_id)
);

-- One post link can only be used once across all participants.
create unique index if not exists submissions_unique_link
  on submissions (lower(evidence)) where evidence like 'https://%';

create index if not exists submissions_status_idx on submissions (status);
create index if not exists submissions_quest_idx on submissions (quest_id);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create or replace view leaderboard as
select
  p.id,
  '@' || p.x_handle as name,
  coalesce(sum(s.points_awarded) filter (where s.status = 'Approved'), 0)::int as points,
  (count(*) filter (where s.status = 'Approved'))::int as quests_done
from participants p
join submissions s on s.participant_id = p.id
where p.banned = false
group by p.id
having coalesce(sum(s.points_awarded) filter (where s.status = 'Approved'), 0) > 0;

alter view leaderboard set (security_invoker = true);

alter table participants enable row level security;
alter table quests enable row level security;
alter table submissions enable row level security;
alter table audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the 15 quests. Day 1 = today (UTC). Submissions close at the start of
-- day 28. Change dates later in the admin panel.
-- ---------------------------------------------------------------------------
insert into quests (id, title, description, channel, points, kind, opens_at, closes_at, sort_order)
select
  v.id, v.title, v.description, v.channel, v.points, v.kind,
  c.start + (v.open_day - 1) * interval '1 day',
  c.start + interval '27 days',
  v.id
from (select date_trunc('day', now() at time zone 'utc') at time zone 'utc' as start) c,
(values
  (1, 'Follow & join', 'Follow the official Osmotix account on X and join the official Telegram group. Enter your X and Telegram usernames below. The team checks both before awarding points.', 'X + Telegram', 10, 'username', 1),
  (2, 'Original introduction post', 'Post an original introduction on X: who you are and why you are joining Osmotix. Include #Osmotix, then submit the link to your post.', 'X', 20, 'link', 1),
  (3, 'Community roll call', 'Say hello in the roll call thread in the Telegram group, then paste the link to your message (or the exact text you posted).', 'Telegram', 10, 'text', 1),
  (4, 'Project knowledge quiz', 'Answer the quiz question pinned in the Telegram group and type your answer below. The team checks it.', 'Telegram', 15, 'text', 1),
  (5, 'Original meme', 'Make an original Osmotix meme. Post it on X and share it in the Telegram group, then submit the X link. Copied or reposted images are rejected.', 'X + Telegram', 20, 'link', 8),
  (6, 'Educational thread', 'Write a thread of at least 3 posts that explains what Osmotix is to someone new. Submit the link to the first post.', 'X', 25, 'link', 8),
  (7, 'Product feedback', 'Share specific, useful feedback on the Osmotix website or product: what works, what is confusing, what to add. Write it below.', 'Telegram', 20, 'text', 8),
  (8, 'Community artwork', 'Create original artwork for Osmotix. Post it on X and in the Telegram group, then submit the X link.', 'X + Telegram', 25, 'link', 8),
  (9, 'Wallet-safety challenge', 'Post a short guide on X about staying safe with crypto wallets: never share seed phrases or private keys, and check links before clicking. Share it in Telegram, then submit the X link.', 'X + Telegram', 15, 'link', 15),
  (10, 'Community poll', 'Run a poll on X about Osmotix or the Base ecosystem. Submit the link to your poll.', 'X', 10, 'link', 15),
  (11, 'Website explorer feedback', 'Explore osmotix.xyz, then post your honest feedback on X: one thing you liked and one thing to improve. Submit the link.', 'Website + X', 15, 'link', 15),
  (12, 'Claim-process explainer', 'Explain in your own words how rewards will be announced and claimed, using only information from official Osmotix announcements. Post on X, share in Telegram, then submit the X link.', 'X + Telegram', 20, 'link', 15),
  (13, 'Genuine referral', 'Invite a real friend to the Telegram group and the campaign. Enter their Telegram username below. Fake or duplicate referrals are rejected.', 'X + Telegram', 20, 'text', 22),
  (14, 'Ecosystem idea', 'Post one concrete idea that would help the Osmotix community or the Base ecosystem. Submit the link to your post.', 'X', 25, 'link', 22),
  (15, 'Community champion recap', 'Post a recap of your campaign on X: what you did, what you learned, and what you would improve. Share it in Telegram, then submit the X link.', 'X + Telegram', 30, 'link', 22)
) as v(id, title, description, channel, points, kind, open_day)
on conflict (id) do nothing;
