'use strict';
/**
 * backfill-db.js
 * ──────────────────────────────────────────────────────────────
 * One-time script: push all existing articles + linkedin posts
 * from local JSON files into Supabase tables.
 *
 * Run once:
 *   node scripts/backfill-db.js
 *
 * Safe to re-run — uses upsert (on conflict do nothing) so
 * existing rows won't be duplicated or overwritten.
 * ──────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: '.env.local' });
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

// ── Generic Supabase upsert ──────────────────────────────────
async function upsert(table, rows) {
  if (!rows.length) { console.log(`  ⏭️  ${table}: nothing to insert`); return; }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'resolution=ignore-duplicates,return=minimal',
      // ↑ "ignore-duplicates" = skip rows where primary key already exists
    },
    body: JSON.stringify(rows),
  });

  if (res.ok) {
    console.log(`  ✅  ${table}: ${rows.length} row(s) upserted`);
  } else {
    const err = await res.text();
    console.error(`  ❌  ${table} failed (${res.status}): ${err}`);
  }
}

// ── Load local JSON files ────────────────────────────────────
function load(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠️  Could not read ${filePath}: ${e.message}`);
    return [];
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🔄  Supabase Backfill — starting\n');

  // ── 1. articles ──────────────────────────────────────────
  console.log('📚  Backfilling: articles + article_images');
  const articles = load(path.join(process.cwd(), 'data', 'articles.json'));

  const articleRows = articles.map(a => ({
    id:                 a.id || a.slug,
    slug:               a.slug,
    title:              a.title,
    date:               a.date,
    category:           a.category,
    category_name:      a.categoryName,
    summary:            a.summary,
    content:            a.content,
    real_world_example: a.realWorldExample || null,
    key_points:         a.keyPoints        || [],
    tags:               a.tags             || [],
    quiz:               a.quiz             || [],
    created_at:         a.date + 'T07:00:00.000Z',
  }));

  const imageRows = articles
    .filter(a => a.image)
    .map(a => ({
      article_id:  a.slug,
      image_url:   a.image,
      image_query: a.imageQuery || a.categoryName || '',
      source:      'unsplash',
      created_at:  a.date + 'T07:00:00.000Z',
    }));

  await upsert('articles',       articleRows);
  await upsert('article_images', imageRows);

  // ── 2. linkedin_posts ─────────────────────────────────────
  console.log('\n📣  Backfilling: linkedin_posts');
  const posts = load(path.join(process.cwd(), 'data', 'linkedin-posts.json'));

  // De-duplicate by linkedinPostId (keep only unique real posts)
  const seen    = new Set();
  const postRows = [];
  for (const p of posts) {
    const key = p.linkedinPostId || p.articleSlug + '_' + p.date;
    if (seen.has(key)) {
      console.log(`  ⏭️  Skipping duplicate: ${key}`);
      continue;
    }
    seen.add(key);
    postRows.push({
      article_id:       p.articleSlug,
      article_title:    p.articleTitle,
      post_text:        p.postText,
      article_url:      p.articleUrl,
      linkedin_post_id: p.linkedinPostId || null,
      has_image:        p.hasImage       || false,
      posted_at:        p.postedAt       || (p.date + 'T07:00:00.000Z'),
    });
  }

  await upsert('linkedin_posts', postRows);

  console.log('\n✅  Backfill complete!\n');
}

main().catch(err => {
  console.error('❌  Backfill error:', err.message);
  process.exit(1);
});
