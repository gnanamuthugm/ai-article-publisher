-- Instagram Posts Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS instagram_posts (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE NOT NULL UNIQUE,
  topic           TEXT NOT NULL,
  post_id         TEXT,
  caption         TEXT,
  image_url_1     TEXT,
  image_url_2     TEXT,
  quiz_question   TEXT,
  quiz_correct    TEXT,
  posted_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_instagram_posts_date ON instagram_posts(date DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read (for website display)
CREATE POLICY "Public read instagram_posts"
  ON instagram_posts FOR SELECT
  USING (true);

-- Allow service role to insert (for the script)
CREATE POLICY "Service insert instagram_posts"
  ON instagram_posts FOR INSERT
  WITH CHECK (true);
