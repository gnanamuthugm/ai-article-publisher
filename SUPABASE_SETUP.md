# Supabase Setup — Run this SQL in Supabase SQL Editor

## Step 1: Create the comments table

```sql
create table if not exists comments (
  id          uuid default gen_random_uuid() primary key,
  article_id  text        not null,
  name        text        not null,
  comment     text        not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- Index for fast lookup by article
create index if not exists idx_comments_article_id on comments(article_id);

-- Enable Row Level Security
alter table comments enable row level security;

-- Allow anyone to read comments
create policy "Public read" on comments
  for select using (true);

-- Allow anyone to insert comments
create policy "Public insert" on comments
  for insert with check (true);

-- Allow anyone to update comments (edit feature)
create policy "Public update" on comments
  for update using (true);
```

## Step 2: Get your credentials

Go to: Supabase Dashboard → Project Settings → API

Copy:
- Project URL  → NEXT_PUBLIC_SUPABASE_URL
- anon public  → NEXT_PUBLIC_SUPABASE_ANON_KEY

## Step 3: Add to .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## Step 4: Add same values to Vercel

Vercel Dashboard → Project → Settings → Environment Variables
Add both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

## Step 5: Add to GitHub Secrets (for the bot)

GitHub Repo → Settings → Secrets → Actions:
- GEMINI_API_KEY
- UNSPLASH_ACCESS_KEY
(Supabase keys are NEXT_PUBLIC so they're in Vercel, not needed in Actions)

---

## How to view all comments in Supabase

Go to: Supabase Dashboard → Table Editor → comments table
You can see all comments with article_id, name, comment, timestamps.

Filter by article_id to see comments for a specific article.
