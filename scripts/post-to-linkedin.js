const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

// ============================================================
// LinkedIn Daily Auto-Post — v2.0
// Posts a SHORT teaser (text only + blog URL) daily
// NOTE: LinkedIn API does not support external image URLs directly.
// We post text-only with article link (clean and reliable).
// ============================================================

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');
const LINKEDIN_LOG_PATH = path.join(process.cwd(), 'data', 'linkedin-posts.json');

const BLOG_BASE_URL = process.env.BLOG_BASE_URL || 'https://ai-article-publisher.vercel.app';
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN;

// ── Generate LinkedIn teaser via Gemini ──
async function generateLinkedInTeaser(article) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a LinkedIn content expert writing on behalf of Gnanamuthu G, an AI & Contact Center specialist.

Create a LinkedIn post to tease this blog article:
Title: "${article.title}"
Summary: "${article.summary}"
Category: ${article.categoryName}

STRICT RULES:
- 3 to 5 lines of text total
- Line 1: A powerful hook — surprising fact, bold question, or contrarian statement that stops scrolling
- Lines 2-3: 1-2 specific insights or practical takeaways from the topic (concrete, not vague)
- Last line: A clear call-to-action to read the full article
- End with 3-4 relevant hashtags on a new line
- Tone: professional, expert, conversational — like a senior AI practitioner sharing knowledge
- Max 2 emojis total
- DO NOT copy blog content word for word — this is a unique teaser
- Sign off style: feels like it's from a real expert, not a bot

Return ONLY the post text. No JSON, no explanation, no quotes.

Example:
Most IVR systems fail not because of bad tech — but because of bad design.

Dialogflow CX changes this by separating your conversation logic into Flows and Pages, making complex bots manageable and scalable.

The key insight: one Flow per business function, one Page per conversation step.

Full breakdown in today's article 👇

#DialogflowCX #ConversationalAI #ContactCenter #CCAIP`;

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
    return articles.find(a => a.date === today) || articles[0];
  } catch {
    return null;
  }
}

// ── Load/Save LinkedIn post log ──
function loadPostLog() {
  try {
    return JSON.parse(fs.readFileSync(LINKEDIN_LOG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function savePostLog(log) {
  const dir = path.dirname(LINKEDIN_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LINKEDIN_LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

// ── Post to LinkedIn via API (text only — most reliable) ──
async function postToLinkedIn(text, articleUrl) {
  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    console.log('\n⚠️  LinkedIn credentials not set. Simulated post:\n');
    console.log('─'.repeat(60));
    console.log(text);
    console.log(`\n🔗 Read more: ${articleUrl}`);
    console.log('─'.repeat(60));
    return { simulated: true };
  }

  const fullText = `${text}

🔗 Read more: ${articleUrl}

— Gnanamuthu G | AI & Contact Center Expert
🌐 Portfolio: https://gnanamuthugm.github.io/portfolio/`;

  // LinkedIn UGC Post — TEXT ONLY (most reliable, no image upload needed)
  const postBody = {
    author: LINKEDIN_PERSON_URN,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: fullText,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  console.log('\n📤 Posting to LinkedIn...');
  console.log('👤 Author URN:', LINKEDIN_PERSON_URN);
  console.log('📝 Post preview:\n', fullText.substring(0, 100), '...\n');

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

  if (!res.ok) {
    console.error('❌ LinkedIn API Response:', responseText);
    throw new Error(`LinkedIn API error ${res.status}: ${responseText}`);
  }

  console.log('✅ LinkedIn API Response:', responseText);
  return JSON.parse(responseText);
}

// ── Main ──
async function main() {
  console.log('\n📣 LinkedIn Auto-Post Generator v2.0\n');

  // Validate credentials
  console.log('🔑 Token present:', !!LINKEDIN_ACCESS_TOKEN);
  console.log('👤 URN present:', !!LINKEDIN_PERSON_URN);
  console.log('🌐 Blog URL:', BLOG_BASE_URL);

  const article = getTodaysArticle();
  if (!article) {
    console.error('❌ No article found. Run generate-daily-blog.js first.');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  console.log(`\n📅 Date: ${today}`);
  console.log(`📌 Article: "${article.title}"`);

  // Check if already posted today
  const log = loadPostLog();
  if (log.find(p => p.date === today)) {
    console.log('✅ Already posted to LinkedIn today. Skipping.');
    return;
  }

  // Generate teaser
  console.log('\n🤖 Generating teaser via Gemini...');
  const teaserText = await generateLinkedInTeaser(article);
  console.log('✅ Teaser generated:\n');
  console.log(teaserText);

  // Build article URL
  const articleUrl = `${BLOG_BASE_URL}/en/blog/${article.slug}`;

  // Post to LinkedIn
  const result = await postToLinkedIn(teaserText, articleUrl);

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

  if (result.simulated) {
    console.log('\n⚠️  Simulated (no LinkedIn credentials). Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN.');
  } else {
    console.log(`\n🎉 Successfully posted to LinkedIn!`);
    console.log(`🆔 Post ID: ${result.id}`);
  }
  console.log(`🔗 Blog URL: ${articleUrl}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
