const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const MODEL = 'gemini-2.5-flash-lite-preview-06-17'; // Free tier: higher quota than 2.0-flash

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');
const LINKEDIN_LOG_PATH = path.join(process.cwd(), 'data', 'linkedin-posts.json');

const BLOG_BASE_URL = process.env.BLOG_BASE_URL || 'https://ai-article-publisher.vercel.app';
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function supabaseInsert(table, record, retries = 3) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(record),
      });
      if (res.ok) { console.log(`✅ Supabase [${table}] saved`); return true; }
      const errText = await res.text();
      console.warn(`⚠️  Supabase [${table}] attempt ${attempt} failed (${res.status}): ${errText}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 2000));
    } catch (e) {
      console.warn(`⚠️  Supabase [${table}] attempt ${attempt} error: ${e.message}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  console.error(`❌  Supabase [${table}] FAILED after ${retries} attempts — data NOT stored in DB!`);
  return false;
}

function buildFallbackTeaser(article) {
  const hook = `Do you really understand ${article.title}?`;
  const insight = article.summary || 'A key concept every Contact Center & AI practitioner should know.';
  const keyPoint = article.keyPoints?.[0] ? `\n💡 ${article.keyPoints[0]}` : '';
  const tags = (article.tags || ['CCAIP', 'DialogflowCX', 'ConversationalAI'])
    .slice(0, 4).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
  return `${hook}\n\n${insight}${keyPoint}\n\nRead today's article 👇\n\n${tags}`;
}

async function generateLinkedInTeaser(article) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  const client = new GoogleGenAI({ apiKey });

  const prompt = `Write a LinkedIn post for this article:
Title: "${article.title}"
Summary: "${article.summary}"

RULES:
- 3 to 5 lines total
- Line 1: Powerful hook (surprising fact or bold question)
- Lines 2-3: 1-2 specific insights from the topic
- Last line: Call-to-action like "Read today's article 👇"
- End with 3-4 hashtags on a new line
- Max 2 emojis
- NO signatures, NO portfolio links, NO "— Name"

Return ONLY the post text.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`Attempt ${attempt}/2`);
      const response = await client.models.generateContent({ model: MODEL, contents: prompt });
      return response.text.trim();
    } catch (err) {
      const msg = err.message || '';
      const is429or503 = msg.includes('429') || msg.includes('503');
      if (attempt === 1 && is429or503) {
        console.log(`Waiting 65 seconds before retry...`);
        await new Promise(r => setTimeout(r, 65000));
        continue;
      }
      throw err;
    }
  }
}

// IST date helper — GitHub Actions UTC-ல் run ஆகுது, IST use பண்ணணும்
function getISTDate() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function getTodaysArticle() {
  const today = getISTDate();
  try {
    const articles = JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8'));
    // First try exact today match, fallback to most recent article
    return articles.find(a => a.date === today) || articles[0];
  } catch { return null; }
}

function loadPostLog() {
  try { return JSON.parse(fs.readFileSync(LINKEDIN_LOG_PATH, 'utf8')); } catch { return []; }
}

function savePostLog(log) {
  const dir = path.dirname(LINKEDIN_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LINKEDIN_LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

// ── Upload image to LinkedIn and get image URN ──
async function uploadImageToLinkedIn(imageUrl) {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) return null;

  try {
    // Step 1: Register image upload
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: LINKEDIN_PERSON_URN,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      }),
    });

    if (!registerRes.ok) {
      console.log('⚠️  Image register failed — posting without image');
      return null;
    }

    const registerData = await registerRes.json();
    const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
    const assetUrn = registerData.value?.asset;

    if (!uploadUrl || !assetUrn) return null;

    // Step 2: Download image from Unsplash
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();

    // Step 3: Upload image to LinkedIn
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'image/jpeg',
      },
      body: imgBuffer,
    });

    if (!uploadRes.ok) {
      console.log('⚠️  Image upload failed — posting without image');
      return null;
    }

    console.log(`✅ Image uploaded to LinkedIn: ${assetUrn}`);
    return assetUrn;
  } catch (e) {
    console.log(`⚠️  Image upload error: ${e.message} — posting without image`);
    return null;
  }
}

async function postToLinkedIn(teaserText, articleUrl, imageUrn) {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    console.log('\n⚠️  No LinkedIn credentials — simulated post:\n');
    console.log(teaserText);
    console.log(`\n🔗 ${articleUrl}`);
    return { simulated: true };
  }

  const fullText = `${teaserText}\n\n🔗 Read more: ${articleUrl}`;

  // Post with image if available, else text only
  const shareContent = imageUrn ? {
    shareCommentary: { text: fullText },
    shareMediaCategory: 'IMAGE',
    media: [{
      status: 'READY',
      description: { text: teaserText.substring(0, 200) },
      media: imageUrn,
      title: { text: 'Read the full article' },
    }],
  } : {
    shareCommentary: { text: fullText },
    shareMediaCategory: 'NONE',
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: LINKEDIN_PERSON_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });

  const responseText = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${responseText}`);
  return JSON.parse(responseText);
}

// IST date check — odd dates only (same as generate-daily-blog.js)
function isPublishDay() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCDate() % 2 === 1;
}

async function main() {
  console.log('\n📣 LinkedIn Auto-Post\n');

  // ── Alternate day gate (must match generate-daily-blog.js) ──
  if (!isPublishDay()) {
    console.log('📅 Today is a rest day (even date) — skipping LinkedIn post.');
    console.log('⏭️  Next publish day is tomorrow.');
    return;
  }

  const today = getISTDate();

  const article = getTodaysArticle();
  if (!article) {
    console.log('⚠️  No article found — skipping LinkedIn post.');
    return;
  }

  // ── Guard: only post today's article, not fallback to articles[0] ──
  if (article.date !== today) {
    console.log(`⚠️  No article published today (${today}) — latest is ${article.date}. Skipping.`);
    return;
  }

  console.log(`📅 ${today} | 📌 "${article.title}"`);

  const log = loadPostLog();
  if (log.find(p => p.date === today)) {
    console.log('✅ Already posted today. Skipping.');
    return;
  }

  let teaserText;
  try {
    teaserText = await generateLinkedInTeaser(article);
    console.log('\n✅ Teaser (Gemini):\n' + teaserText);
  } catch (err) {
    console.log(`⚠️  Gemini teaser failed: ${err.message.substring(0, 100)}`);
    console.log('🔄 Using fallback teaser from article summary...');
    teaserText = buildFallbackTeaser(article);
    console.log('\n✅ Teaser (fallback):\n' + teaserText);
  }

  const articleUrl = `${BLOG_BASE_URL}/en/blog/${article.slug}`;

  // Try uploading article image to LinkedIn
  let imageUrn = null;
  if (article.image) {
    console.log(`\n🖼️  Uploading image to LinkedIn...`);
    imageUrn = await uploadImageToLinkedIn(article.image);
  }

  let result;
  try {
    result = await postToLinkedIn(teaserText, articleUrl, imageUrn);
  } catch (err) {
    console.log(`⚠️  LinkedIn post failed: ${err.message.substring(0, 100)}`);
    // Try once more without image
    if (imageUrn) {
      console.log('🔄 Retrying without image...');
      try {
        result = await postToLinkedIn(teaserText, articleUrl, null);
      } catch (e) {
        console.log(`⚠️  Retry also failed: ${e.message.substring(0, 100)}`);
        return;
      }
    } else {
      return;
    }
  }

  const logEntry = {
    date: today,
    articleSlug: article.slug,
    articleTitle: article.title,
    postText: teaserText,
    articleUrl,
    linkedinPostId: result.id || 'simulated',
    hasImage: !!imageUrn,
    postedAt: new Date().toISOString(),
  };

  log.unshift(logEntry);
  savePostLog(log);

  await supabaseInsert('linkedin_posts', {
    article_id:       article.slug,
    article_title:    article.title,
    post_text:        teaserText,
    article_url:      articleUrl,
    linkedin_post_id: result.id || null,
    has_image:        !!imageUrn,
    posted_at:        new Date().toISOString(),
  });

  if (result.simulated) {
    console.log('\n⚠️  Simulated post.');
  } else {
    console.log(`\n🎉 Posted to LinkedIn! ID: ${result.id} ${imageUrn ? '(with image)' : '(text only)'}`);
  }
}

main().catch(err => {
  console.log(`⚠️  LinkedIn script error: ${err.message}`);
  console.log('⏭️  Workflow continuing safely.');
  process.exit(0);
});
