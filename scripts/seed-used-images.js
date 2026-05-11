/**
 * seed-used-images.js
 * 
 * One-time script — Run this ONCE to populate data/used-images.json
 * with all Unsplash photo IDs already used in existing articles.
 * 
 * This prevents future articles from reusing old images.
 * 
 * Usage:
 *   node scripts/seed-used-images.js
 */

const fs = require('fs');
const path = require('path');

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');
const USED_IMAGES_PATH = path.join(process.cwd(), 'data', 'used-images.json');

function extractUnsplashId(url) {
  if (!url || typeof url !== 'string') return null;
  // Only process Unsplash URLs
  if (!url.includes('unsplash.com')) return null;
  const match = url.match(/photo-[a-zA-Z0-9_-]+/);
  return match ? match[0] : null;
}

function main() {
  console.log('\n🌱 Seeding used-images.json from existing articles...\n');

  // Load existing articles
  let articles = [];
  try {
    const raw = fs.readFileSync(ARTICLES_PATH, 'utf8');
    articles = JSON.parse(raw);
    console.log(`📚 Loaded ${articles.length} existing articles`);
  } catch (e) {
    console.error('❌ Could not read articles.json:', e.message);
    process.exit(1);
  }

  // Load existing used-images (if any)
  let existingIds = new Set();
  try {
    const raw = fs.readFileSync(USED_IMAGES_PATH, 'utf8');
    existingIds = new Set(JSON.parse(raw));
    console.log(`📋 Found ${existingIds.size} already-tracked IDs`);
  } catch {
    console.log('📋 No existing used-images.json, starting fresh');
  }

  // Extract all Unsplash photo IDs from articles
  let added = 0;
  let skipped = 0;
  let nonUnsplash = 0;

  for (const article of articles) {
    const id = extractUnsplashId(article.image);
    if (!id) {
      // Local image (e.g. /images/post_launch.png) — skip
      nonUnsplash++;
      continue;
    }
    if (existingIds.has(id)) {
      skipped++;
      continue;
    }
    existingIds.add(id);
    added++;
    console.log(`  ✅ Added: ${id}  ← ${article.slug}`);
  }

  // Save the updated set
  const dir = path.dirname(USED_IMAGES_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USED_IMAGES_PATH, JSON.stringify([...existingIds], null, 2), 'utf8');

  console.log(`
✅ Done!
   Added   : ${added} new Unsplash IDs
   Skipped : ${skipped} already tracked
   Ignored : ${nonUnsplash} local/non-Unsplash images
   Total tracked : ${existingIds.size} IDs
   Saved to: data/used-images.json
`);
}

main();
