# Supabase — 3 Tables Setup
# Go to: supabase.com → Your Project → SQL Editor → New Query → Paste all → Run

```sql
-- ══════════════════════════════════════════════
-- TABLE 1: articles — stores all blog articles
-- ══════════════════════════════════════════════
create table if not exists articles (
  id                text        primary key,
  slug              text        not null unique,
  title             text        not null,
  date              date        not null,
  category          text        not null,
  category_name     text,
  summary           text,
  content           text,
  real_world_example text,
  key_points        jsonb       default '[]',
  tags              jsonb       default '[]',
  quiz              jsonb       default '[]',
  created_at        timestamptz default now()
);

create index if not exists idx_articles_date     on articles(date desc);
create index if not exists idx_articles_category on articles(category);

alter table articles enable row level security;
create policy "Public read articles"   on articles for select using (true);
create policy "Service insert articles" on articles for insert with check (true);

-- ══════════════════════════════════════════════
-- TABLE 2: article_images — stores image data
-- ══════════════════════════════════════════════
create table if not exists article_images (
  id          uuid        default gen_random_uuid() primary key,
  article_id  text        not null references articles(id) on delete cascade,
  image_url   text        not null,
  image_query text,
  source      text        default 'unsplash',
  created_at  timestamptz default now()
);

create index if not exists idx_images_article_id on article_images(article_id);

alter table article_images enable row level security;
create policy "Public read images"    on article_images for select using (true);
create policy "Service insert images" on article_images for insert with check (true);

-- ══════════════════════════════════════════════
-- TABLE 3: linkedin_posts — stores LinkedIn post logs
-- ══════════════════════════════════════════════
create table if not exists linkedin_posts (
  id               uuid        default gen_random_uuid() primary key,
  article_id       text        not null,
  article_title    text,
  post_text        text        not null,
  article_url      text,
  linkedin_post_id text,
  posted_at        timestamptz default now()
);

create index if not exists idx_linkedin_article_id on linkedin_posts(article_id);
create index if not exists idx_linkedin_posted_at  on linkedin_posts(posted_at desc);

alter table linkedin_posts enable row level security;
create policy "Public read linkedin_posts"    on linkedin_posts for select using (true);
create policy "Service insert linkedin_posts" on linkedin_posts for insert with check (true);

-- ══════════════════════════════════════════════
-- TABLE 4: comments (already exists — keeping it)
-- ══════════════════════════════════════════════
create table if not exists comments (
  id          uuid        default gen_random_uuid() primary key,
  article_id  text        not null,
  name        text        not null,
  comment     text        not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

create index if not exists idx_comments_article_id on comments(article_id);

alter table comments enable row level security;
create policy "Public read comments"   on comments for select using (true);
create policy "Public insert comments" on comments for insert with check (true);
create policy "Public update comments" on comments for update using (true);
create policy "Public delete comments" on comments for delete using (true);
```
