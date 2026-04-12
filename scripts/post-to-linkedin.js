const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');
const LINKEDIN_LOG_PATH = path.join(process.cwd(), 'data', 'linkedin-posts.json');

const BLOG_BASE_URL = process.env.BLOG_BASE_URL || 'https://ai-article-publisher.vercel.app';
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function supabaseInsert(table, record) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(record),
    });
    if (res.ok) console.log(`✅ Supabase [${table}] saved`);
    else console.warn(`⚠️  Supabase [${table}]:`, await res.text());
  } catch (e) {
    console.warn(`⚠️  Supabase [${table}] failed:`, e.message);
  }
}

async function generateLinkedInTeaser(article) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a LinkedIn content expert. Write a LinkedIn post for this article:

Title: "${article.title}"
Summary: "${article.summary}"
Category: ${article.categoryName}

STRICT RULES:
- 3 to 5 lines of engaging text only
- Line 1: Powerful hook (surprising fact, bold question, or contrarian statement)
- Lines 2-3: 1-2 specific insights or key takeaways
- Last line: Call-to-action like "Read today's article 👇"
- New line with 3-4 relevant hashtags
- Max 2 emojis in main text
- NO signatures, NO "— Name", NO portfolio links
- Professional conversational tone

Return ONLY the post text. Nothing else.`;

  // Try multiple models
  const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];
  for (const model of models) {
    try {
      const response = await client.models.generateContent({ model, contents: prompt });
      return response.text.trim();
    } catch (e) {
      console.warn(`⚠️  Model ${model} failed:`, e.message.substring(0, 60));
    }
  }
  throw new Error('All Gemini models failed for LinkedIn teaser');
}

function getTodaysArticle() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const articles = JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8'));
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

async function postToLinkedIn(teaserText, articleUrl) {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    console.log('\n⚠️  No LinkedIn credentials — simulated post:\n');
    console.log('─'.repeat(60));
    console.log(teaserText);
    console.log(`\n🔗 Read more: ${articleUrl}`);
    console.log('─'.repeat(60));
    return { simulated: true };
  }

  const fullText = `${teaserText}\n\n🔗 Read more: ${articleUrl}`;

  const postBody = {
    author: LINKEDIN_PERSON_URN,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: fullText },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  console.log('\n📤 Posting to LinkedIn...');
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  const responseText = await res.text();
  if (!res.ok) throw new Error(`LinkedIn API ${res.status}: ${responseText}`);
  return JSON.parse(responseText);
}

async function main() {
  console.log('\n📣 LinkedIn Auto-Post v2.2\n');

  const article = getTodaysArticle();
  if (!article) {
    console.error('❌ No article found.');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Date: ${today}`);
  console.log(`📌 Article: "${article.title}"`);

  const log = loadPostLog();
  if (log.find(p => p.date === today)) {
    console.log('✅ Already posted to LinkedIn today. Skipping.');
    return;
  }

  console.log('\n🤖 Generating teaser...');
  const teaserText = await generateLinkedInTeaser(article);
  console.log('✅ Teaser:\n');
  console.log(teaserText);

  const articleUrl = `${BLOG_BASE_URL}/en/blog/${article.slug}`;
  const result = await postToLinkedIn(teaserText, articleUrl);

  const logEntry = {
    date: today,
    articleSlug: article.slug,
    articleTitle: article.title,
    postText: teaserText,
    articleUrl,
    linkedinPostId: result.id || 'simulated',
    postedAt: new Date().toISOString(),
  };

  // ── Save to local JSON ──
  log.unshift(logEntry);
  savePostLog(log);

  // ── Save to Supabase: linkedin_posts table ──
  await supabaseInsert('linkedin_posts', {
    article_id: article.slug,
    article_title: article.title,
    post_text: teaserText,
    article_url: articleUrl,
    linkedin_post_id: result.id || null,
    posted_at: new Date().toISOString(),
  });

  if (result.simulated) {
    console.log('\n⚠️  Simulated (no LinkedIn credentials).');
  } else {
    console.log(`\n🎉 Posted to LinkedIn! ID: ${result.id}`);
  }
  console.log(`🔗 ${articleUrl}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
