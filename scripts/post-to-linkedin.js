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
    console.warn(`⚠️  Supabase [${table}]:`, e.message);
  }
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

  // ✅ Correct model names
  const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash'];
  for (const model of MODELS) {
    try {
      const response = await client.models.generateContent({ model, contents: prompt });
      return response.text.trim();
    } catch (e) {
      console.warn(`⚠️  ${model} failed:`, e.message.substring(0, 80));
    }
  }
  throw new Error('All Gemini models failed');
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
    console.log('\n⚠️  No LinkedIn credentials — simulated:\n');
    console.log(teaserText);
    console.log(`\n🔗 ${articleUrl}`);
    return { simulated: true };
  }

  const fullText = `${teaserText}\n\n🔗 Read more: ${articleUrl}`;

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
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: fullText },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });

  const responseText = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${responseText}`);
  return JSON.parse(responseText);
}

async function main() {
  console.log('\n📣 LinkedIn Auto-Post\n');

  const article = getTodaysArticle();
  if (!article) { console.error('❌ No article found.'); process.exit(1); }

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 ${today} | 📌 "${article.title}"`);

  const log = loadPostLog();
  if (log.find(p => p.date === today)) {
    console.log('✅ Already posted today. Skipping.');
    return;
  }

  const teaserText = await generateLinkedInTeaser(article);
  console.log('\n✅ Teaser:\n' + teaserText);

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

  log.unshift(logEntry);
  savePostLog(log);

  await supabaseInsert('linkedin_posts', {
    article_id: article.slug,
    article_title: article.title,
    post_text: teaserText,
    article_url: articleUrl,
    linkedin_post_id: result.id || null,
    posted_at: new Date().toISOString(),
  });

  if (result.simulated) {
    console.log('\n⚠️  Simulated post.');
  } else {
    console.log(`\n🎉 Posted! ID: ${result.id}`);
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
