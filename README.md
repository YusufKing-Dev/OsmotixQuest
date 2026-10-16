# Osmotix 30-Day Quest

Light, flat, Base-blue quest site for the Osmotix airdrop campaign. Next.js (App Router) + Supabase. No wallet connection, no email, no bot.

## How it works

1. A participant joins once with their **X username** and **Telegram username**.
2. Each quest has a submission box: a **link** (X posts), a **written response**, or the two **usernames** (follow / join quest).
3. Every submission is **Pending (under verification)**. No points are counted yet.
4. An admin opens `/admin`, checks the evidence, and approves or rejects it (with a reason). **Points are added only on approval**, and only approved points appear on the leaderboard.
5. Rejected participants can resubmit, or appeal within 48 hours.

Built-in abuse limits: one profile per X username (an X account that is already linked cannot be registered again), one submission per quest, one post link can only be used once across all participants, and admins can ban an account.

## Setup (about 10 minutes)

1. **Node 22 LTS** or newer.
2. **Supabase:** create a project, open the SQL editor, run `supabase/schema.sql`. Copy the project URL and the `service_role` key (Project Settings > API).
3. **Env vars:** copy `.env.example` to `.env.local` and fill it in (including a long `ADMIN_PASSWORD`).
4. **Run locally:** `npm install` then `npm run dev`.
5. **Deploy (Vercel):** import the project, add the same env vars, deploy.
6. Open `/admin`, log in, and check each quest's open/close dates (the seed uses today as Day 1; submissions close at the start of day 28).

## Admin panel (`/admin`)

- **Review:** filter by status and quest, bulk approve or reject (rejection needs a reason), copy X handles (handy for checking follows against your followers list), export CSV, ban or unban.
- **Quests:** add new quests or edit existing ones (title, instructions, channel, points, submission type, UTC window, visibility). New quests go live immediately.
- **Audit log:** every approval, rejection, appeal, ban, and quest change.

## Things to know

- Anyone can join with any username, so check that the post author or follower matches the username before approving.
- On joining, each participant gets a one-time **access code**. It is the only way to sign back in after clearing the browser or changing device. If someone loses it, use **Reset code** in Admin > Review and send them the new one privately.
- A new person can claim any X username that is not yet taken, so check that the post author or follower matches the username before approving.
- The admin area uses one shared password. Use a long one and do not share the link.
- The reward module is intentionally not included, per the brief.
