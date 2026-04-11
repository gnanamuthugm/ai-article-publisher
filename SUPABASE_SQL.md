# Supabase — Run this SQL in SQL Editor

## Go to: supabase.com → Your Project → SQL Editor → New Query → Paste → Run

```sql
-- ── 1. Comments table ──────────────────────────────────────────
drop table if exists commentlog;
drop table if exists comments;

create table comments (
  id          uuid        default gen_random_uuid() primary key,
  article_id  text        not null,
  name        text        not null,
  comment     text        not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz
);

create index idx_comments_article_id on comments(article_id);

-- ── 2. CommentLog table — tracks every edit & delete ───────────
create table commentlog (
  id          uuid        default gen_random_uuid() primary key,
  comment_id  uuid        not null,
  article_id  text        not null,
  user_name   text        not null,
  action      text        not null check (action in ('edit', 'delete')),
  old_content text        not null,
  new_content text,
  edited_at   timestamptz default now() not null
);

create index idx_commentlog_comment_id on commentlog(comment_id);
create index idx_commentlog_article_id on commentlog(article_id);

-- ── 3. Row Level Security ──────────────────────────────────────
alter table comments    enable row level security;
alter table commentlog  enable row level security;

-- Comments policies
create policy "Anyone can read comments"
  on comments for select using (true);

create policy "Anyone can post comments"
  on comments for insert with check (true);

create policy "Anyone can edit comments"
  on comments for update using (true);

create policy "Anyone can delete comments"
  on comments for delete using (true);

-- CommentLog policies
create policy "Anyone can read commentlog"
  on commentlog for select using (true);

create policy "Anyone can insert commentlog"
  on commentlog for insert with check (true);
```

## What each table does:

### `comments` table
| Column | Description |
|---|---|
| id | Unique comment ID |
| article_id | Which article this comment belongs to |
| name | Commenter's name |
| comment | Comment text |
| created_at | When posted |
| updated_at | When last edited (null if never edited) |

### `commentlog` table — audit trail
| Column | Description |
|---|---|
| id | Log entry ID |
| comment_id | Which comment was changed |
| article_id | Which article |
| user_name | Who made the change |
| action | "edit" or "delete" |
| old_content | Content BEFORE the change |
| new_content | Content AFTER edit (null for delete) |
| edited_at | Exact timestamp of change |
