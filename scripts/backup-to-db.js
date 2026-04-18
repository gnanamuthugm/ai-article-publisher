// ============================================================
// DB Backup Script — Push existing articles.json to Supabase
// Run once: node scripts/backup-to-db.js
// ============================================================

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

async function upsert(table, record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(record),
  });
  if (res.ok) return true;
  const err = await res.text();
  console.warn(`  ⚠️  ${table} upsert error:`, err.substring(0, 100));
  return false;
}

async function main() {
  console.log('\n🚀 DB Backup — Pushing articles.json to Supabase\n');

  const articlesPath = path.join(process.cwd(), 'data', 'articles.json');
  const linkedinPath = path.join(process.cwd(), 'data', 'linkedin-posts.json');

  // ── Backup Articles ──
  let articles = [];
  try {
    articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    console.log(`📚 Found ${articles.length} articles to backup\n`);
  } catch (e) {
    console.log('⚠️  articles.json not found or empty');
  }

  let articleOk = 0;
  for (const a of articles) {
    process.stdout.write(`  → Saving article: "${a.title?.substring(0, 50)}"... `);

    const ok = await upsert('articles', {
      id: a.id || a.slug,
      slug: a.slug,
      title: a.title,
      date: a.date,
      category: a.category,
      category_name: a.categoryName,
      summary: a.summary,
      content: a.content,
      real_world_example: a.realWorldExample,
      key_points: a.keyPoints || [],
      tags: a.tags || [],
      quiz: a.quiz || [],
      created_at: new Date(a.date).toISOString(),
    });

    if (ok) {
      // Also save image
      if (a.image) {
        await upsert('article_images', {
          article_id: a.id || a.slug,
          image_url: a.image,
          image_query: a.imageQuery || '',
          source: 'unsplash',
          created_at: new Date(a.date).toISOString(),
        });
      }
      console.log('✅');
      articleOk++;
    } else {
      console.log('❌');
    }
  }

  console.log(`\n✅ Articles saved: ${articleOk}/${articles.length}`);

  // ── Backup LinkedIn Posts ──
  let posts = [];
  try {
    posts = JSON.parse(fs.readFileSync(linkedinPath, 'utf8'));
    console.log(`\n📣 Found ${posts.length} LinkedIn posts to backup\n`);
  } catch (e) {
    console.log('\n⚠️  linkedin-posts.json not found or empty');
  }

  let postOk = 0;
  for (const p of posts) {
    process.stdout.write(`  → Saving post: "${p.articleTitle?.substring(0, 40)}"... `);
    const ok = await upsert('linkedin_posts', {
      article_id: p.articleSlug,
      article_title: p.articleTitle,
      post_text: p.postText,
      article_url: p.articleUrl,
      linkedin_post_id: p.linkedinPostId || null,
      posted_at: p.postedAt || new Date().toISOString(),
    });
    console.log(ok ? '✅' : '❌');
    if (ok) postOk++;
  }

  console.log(`\n✅ LinkedIn posts saved: ${postOk}/${posts.length}`);
  console.log('\n🎉 DB Backup complete!\n');
  console.log('📊 Check your Supabase dashboard:');
  console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
