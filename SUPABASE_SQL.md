# Supabase — Run this SQL NOW in SQL Editor

## Go to: supabase.com → Your Project → SQL Editor → New Query → Paste → Run

```sql
-- Drop and recreate comments table with correct schema
drop table if exists comments;

create table comments (
  id          uuid        default gen_random_uuid() primary key,
  article_id  text        not null,
  name        text        not null,
  comment     text        not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz
);

-- Index for fast article lookup
create index idx_comments_article_id on comments(article_id);

-- Row Level Security
alter table comments enable row level security;

-- Policies
create policy "Anyone can read comments"
  on comments for select using (true);

create policy "Anyone can post comments"
  on comments for insert with check (true);

create policy "Anyone can edit comments"
  on comments for update using (true);
```

After running this SQL, go back to your website and try posting a comment — it will work!
