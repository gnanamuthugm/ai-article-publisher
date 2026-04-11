const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

// ============================================================
// LinkedIn Daily Auto-Post — v1.0
// Posts a SHORT teaser (3 lines + image + blog URL) daily
// Content is DIFFERENT from the blog — it's a teaser hook
// Uses LinkedIn API (OAuth2 — setup instructions below)
// ============================================================

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');
const LINKEDIN_LOG_PATH = path.join(process.cwd(), 'data', 'linkedin-posts.json');

// Your blog's public URL (update after Vercel deploy)
const BLOG_BASE_URL = process.env.BLOG_BASE_URL || 'https://your-blog.vercel.app';

// LinkedIn credentials (add to .env.local and GitHub Secrets)
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN; // urn:li:person:XXXXXXX

// ── Generate LinkedIn teaser via Gemini (SHORT, different from blog) ──
async function generateLinkedInTeaser(article) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a LinkedIn content expert. Create a SHORT LinkedIn post to tease a blog article.

Blog Article Title: "${article.title}"
Blog Article Summary: "${article.summary}"
Category: ${article.categoryName}

STRICT RULES:
- EXACTLY 3 lines of text (not 4, not 2 — exactly 3)
- Line 1: A bold hook question or surprising statement that makes someone stop scrolling
- Line 2: One specific insight or stat from the topic (make it concrete)
- Line 3: A call-to-action pointing to the full article
- End with 3-4 relevant hashtags on a new line
- DO NOT repeat the blog content word for word — this is a teaser
- Tone: professional but conversational, like a smart LinkedIn post
- NO emojis overload — max 2 emojis total

Return ONLY the post text. No JSON, no explanation, no quotes around it.

Example format:
Did you know most customers hang up before speaking to an agent — not because of wait time, but because of bad IVR design?

Conversational AI reduces that friction by 60% — and the shift is simpler than you think.

Full breakdown in today's article 👇

#ContactCenter #ConversationalAI #CCAIP #CustomerExperience`;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text.trim();
}

// ── Load today's published article ──
function getTodaysArticle() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const articles = JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8'));
    return articles.find(a => a.date === today) || articles[0]; // fallback to latest
  } catch {
    return null;
  }
}

// ── Load LinkedIn post log ──
function loadPostLog() {
  try {
    return JSON.parse(fs.readFileSync(LINKEDIN_LOG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

// ── Save LinkedIn post log ──
function savePostLog(log) {
  const dir = path.dirname(LINKEDIN_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LINKEDIN_LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

// ── Post to LinkedIn via API ──
async function postToLinkedIn(text, imageUrl, articleUrl) {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    console.log('\n⚠️  LinkedIn credentials not set. Post content preview:\n');
    console.log('─'.repeat(60));
    console.log(text);
    console.log(`\n🔗 Read more: ${articleUrl}`);
    console.log('─'.repeat(60));
    console.log('\nTo enable auto-posting, add to GitHub Secrets:');
    console.log('  LINKEDIN_ACCESS_TOKEN');
    console.log('  LINKEDIN_PERSON_URN');
    return { simulated: true };
  }

  // LinkedIn UGC Post API
  const postBody = {
    author: LINKEDIN_PERSON_URN,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: `${text}\n\n🔗 Read more: ${articleUrl}`,
        },
        shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
        ...(imageUrl && {
          media: [
            {
              status: 'READY',
              description: { text: 'CCAIP Daily Article' },
              originalUrl: imageUrl,
              title: { text: 'Read on CCAIP Daily' },
            },
          ],
        }),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn API error ${res.status}: ${err}`);
  }

  return await res.json();
}

// ── Main ──
async function main() {
  console.log('\n📣 LinkedIn Auto-Post Generator\n');

  const article = getTodaysArticle();
  if (!article) {
    console.error('❌ No article found for today. Run generate-daily-blog.js first.');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if already posted today
  const log = loadPostLog();
  if (log.find(p => p.date === today)) {
    console.log('✅ Already posted to LinkedIn today. Skipping.');
    return;
  }

  console.log(`📌 Article: "${article.title}"`);

  // Generate teaser
  const teaserText = await generateLinkedInTeaser(article);
  console.log('\n✅ LinkedIn teaser generated');

  // Build article URL
  const articleUrl = `${BLOG_BASE_URL}/en/blog/${article.slug}`;

  // Post to LinkedIn
  const result = await postToLinkedIn(teaserText, article.image, articleUrl);

  // Log the post
  log.unshift({
    date: today,
    articleSlug: article.slug,
    articleTitle: article.title,
    postText: teaserText,
    articleUrl,
    linkedinPostId: result.id || 'simulated',
    postedAt: new Date().toISOString(),
  });
  savePostLog(log);

  console.log(`\n🎉 LinkedIn post done!`);
  console.log(`📰 Article: ${article.title}`);
  console.log(`🔗 Blog URL: ${articleUrl}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
