'use strict';
const fs   = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

// ============================================================
// CCAIP Daily Blog Generator — Production
// Model       : gemini-2.0-flash (stable, 1500 RPD free)
// Schedule    : Alternate days — post → skip → post → skip
// Retry       : exponential backoff, max 5 attempts
// State       : persistent JSON (pendingTopics + lastPublishedIndex)
//
// State file example:
// {
//   "lastPublishedIndex": 4,
//   "pendingTopics": [
//     { "topic": "Dialogflow CX Analytics", "categoryId": "dialogflow-cx", "failedAt": "2026-04-19" }
//   ]
// }
// ============================================================

const MODEL = 'gemini-2.5-flash-lite'; // Stable GA release (Feb 2026) — replaces preview-06-17

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── State file path ──────────────────────────────────────────
const STATE_PATH    = path.join(process.cwd(), 'data', 'publish-state.json');
const USED_IMGS_PATH = path.join(process.cwd(), 'data', 'used-images.json');

/** Load used image URLs from disk */
function loadUsedImages() {
  try { return new Set(JSON.parse(fs.readFileSync(USED_IMGS_PATH, 'utf8'))); }
  catch { return new Set(); }
}

/** Save used image URLs to disk */
function saveUsedImages(usedSet) {
  const dir = path.dirname(USED_IMGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USED_IMGS_PATH, JSON.stringify([...usedSet], null, 2), 'utf8');
}

/** @typedef {{ lastPublishedIndex: number, pendingTopics: Array<{topic:string,categoryId:string,failedAt:string}> }} PublishState */

/** Read persistent state from disk. Returns default if missing. */
function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { lastPublishedIndex: -1, pendingTopics: [] };
  }
}

/** Write state back to disk atomically (write-then-rename). */
function writeState(state) {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = STATE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, STATE_PATH);
  console.log(`💾 State saved — lastIndex=${state.lastPublishedIndex}, pending=${state.pendingTopics.length}`);
}

// ── Retry helpers ────────────────────────────────────────────

/** Sleep for `ms` milliseconds. */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Exponential backoff retry wrapper.
 * Respects Retry-After header (passed via error.retryAfter seconds).
 * @param {() => Promise<any>} fn  Async function to retry
 * @param {number} maxAttempts     Max attempts (default 5)
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxAttempts = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`  [attempt ${attempt}/${maxAttempts}]`);
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const is429 = msg.includes('429') || err.status === 429;
      const is503 = msg.includes('503') || err.status === 503;

      if (!is429 && !is503) {
        // Non-retriable error — fail fast
        console.log(`  ✗ Non-retriable error: ${msg.substring(0, 120)}`);
        throw err;
      }

      if (attempt === maxAttempts) break;

      // Respect Retry-After header if API provides it
      const retryAfterSec = err.retryAfter ? parseInt(err.retryAfter, 10) : null;
      const backoffMs = retryAfterSec
        ? retryAfterSec * 1000
        : Math.min(2 ** attempt * 1000, 64000); // 2s, 4s, 8s, 16s, 32s, cap 64s

      console.log(`  ⚠️  ${is429 ? '429 Rate limit' : '503 Unavailable'} — waiting ${backoffMs / 1000}s before retry...`);
      await sleep(backoffMs);
    }
  }
  throw lastErr;
}

async function supabaseInsert(table, record, retries = 3) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(`❌ Supabase NOT configured — ${table} skipped! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in GitHub Secrets.`);
    return false;
  }
  console.log(`🔄 Supabase insert → [${table}] | id: ${record.id || record.article_id || '?'}`);
  console.log(`   URL: ${SUPABASE_URL.substring(0, 40)}...`);
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
      if (res.ok) {
        console.log(`✅ Supabase [${table}] saved`);
        return true;
      }
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

// ── Alternate day check ──────────────────────────────────────
// Uses IST date (UTC+5:30) so publish day matches what user sees
// Odd dates = publish (1,3,5...), Even dates = skip
function isPublishDay() {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow    = new Date(Date.now() + istOffset);
  return istNow.getUTCDate() % 2 === 1;
}

const CATEGORY_SCHEDULE = [
  { id: 'dialogflow-cx', name: 'Dialogflow CX', emoji: '🤖', color: 'blue', imageQuery: 'conversational AI chatbot interface', startMonth: '2026-04' },
  { id: 'conversational-agents-playbook', name: 'Conversational Agents Playbook', emoji: '📖', color: 'purple', imageQuery: 'AI assistant customer service agent', startMonth: '2026-05' },
  { id: 'ces', name: 'Customer Effort Score', emoji: '⭐', color: 'green', imageQuery: 'customer satisfaction feedback survey', startMonth: '2026-06' },
  { id: 'ccaip', name: 'CCAIP', emoji: '🎯', color: 'orange', imageQuery: 'contact center AI platform technology', startMonth: '2026-07' },
];

const TOPICS = {
  'dialogflow-cx': [
    "Introduction to Dialogflow CX: What It Is and Why It Matters",
    "Dialogflow CX vs Dialogflow ES: Key Differences Explained",
    "Understanding Agents, Flows, and Pages in Dialogflow CX",
    "How Intents Work in Dialogflow CX",
    "Training Phrases and Entity Types in Dialogflow CX",
    "Transition Routes and Condition Routes Explained",
    "State Handlers and Route Groups in Dialogflow CX",
    "Fulfillment and Webhooks in Dialogflow CX",
    "Parameters and Session Variables in Dialogflow CX",
    "Forms and Slot Filling in Dialogflow CX",
    "System Functions and Prebuilt Components",
    "Testing and Debugging Conversations in Dialogflow CX",
    "Publishing and Environment Management in Dialogflow CX",
    "Dialogflow CX Integration with Google Cloud",
    "Voice Bot Setup with Dialogflow CX and Telephony",
    "Multi-language Support in Dialogflow CX",
    "Handling Fallbacks and No-Match Events",
    "Sentiment Analysis in Dialogflow CX",
    "Dialogflow CX Analytics and Conversation History",
    "Security and Access Control in Dialogflow CX",
    "Dialogflow CX Pricing and Quota Management",
    "Real-world Case Study: IVR Replacement with Dialogflow CX",
    "Building a Banking Bot with Dialogflow CX",
    "Building a Healthcare Appointment Bot",
    "Dialogflow CX Best Practices and Common Mistakes",
    "Migrating from Legacy IVR to Dialogflow CX",
    "Advanced Webhook Patterns in Dialogflow CX",
    "A/B Testing Conversation Flows",
    "Dialogflow CX + BigQuery for Analytics",
    "Future of Dialogflow CX in 2025 and Beyond",
  ],
  'conversational-agents-playbook': [
    "What is a Conversational Agent Playbook and Why You Need One",
    "Defining Conversation Goals and Success Metrics",
    "User Persona Research for Conversational AI Design",
    "Conversation Design Principles: Natural and Helpful",
    "Writing Effective Bot Responses (Tone, Length, Clarity)",
    "Handling Edge Cases and Unknown Intents",
    "Designing for Voice vs Text: Key Differences",
    "Escalation Playbook: When and How to Transfer to a Human",
    "Error Recovery Playbook: Graceful Failure Handling",
    "Authentication Flows in Conversational Agents",
    "Multi-turn Conversation Design Patterns",
    "Context Carry-Over Between Sessions",
    "Playbook for High-Volume Customer Service Bots",
    "Playbook for Appointment Scheduling Bots",
    "Playbook for Order Tracking and Status Bots",
    "Playbook for FAQ and Knowledge Base Bots",
    "Playbook for Lead Generation Bots",
    "Testing Playbooks: QA for Conversational AI",
    "Monitoring and Continuous Improvement",
    "Training Data Collection and Annotation",
    "Playbook for Multilingual Conversational Agents",
    "Measuring Bot Performance: KPIs That Matter",
    "User Acceptance Testing for Conversational AI",
    "Deployment Playbook: Go-Live Checklist",
    "Post-Launch Optimization Strategies",
    "Playbook for Handling Angry or Frustrated Users",
    "Compliance and Privacy in Conversational Agents",
    "Playbook for Seasonal and Event-Based Bot Updates",
    "Real-world Playbook: Telecom Customer Service Bot",
    "The Future of Conversational Agent Playbooks with GenAI",
  ],
  'ces': [
    "What is Customer Effort Score (CES) and Why It Predicts Loyalty",
    "CES vs CSAT vs NPS: Which Metric Should You Prioritize",
    "How to Design an Effective CES Survey",
    "When and Where to Measure CES (Touchpoint Strategy)",
    "CES Benchmarks by Industry: Where Do You Stand",
    "5 Biggest Causes of High Customer Effort in Contact Centers",
    "Self-Service and CES: How Automation Reduces Effort",
    "IVR Design Principles That Reduce Customer Effort",
    "How Conversational AI Dramatically Lowers CES",
    "Agent Empowerment Strategies That Reduce Customer Effort",
    "Knowledge Base Optimization for Low-Effort Support",
    "First Contact Resolution and Its Direct Impact on CES",
    "Channel Switching Friction: The Hidden CES Killer",
    "Reducing Average Handle Time Without Sacrificing Quality",
    "Proactive Support: Solving Problems Before Customers Call",
    "CES in Digital Channels: Chat, Email, and Social Media",
    "Real-time CES Dashboards for Contact Center Managers",
    "Linking CES Data to Revenue and Churn Metrics",
    "How to Close the Loop on Poor CES Scores",
    "Building a Low-Effort Customer Journey Map",
    "CES and Employee Experience: The Connection",
    "CES for B2B vs B2C: Different Approaches",
    "Using AI to Predict and Prevent High-Effort Interactions",
    "CES Case Study: Telecom Company Reduces Effort by 40%",
    "CES Case Study: E-commerce Brand Improves Loyalty",
    "Implementing CES Measurement: Step-by-Step Guide",
    "Reporting CES to Leadership: What to Include",
    "Common CES Measurement Mistakes to Avoid",
    "CES and Customer Lifetime Value: The Business Case",
    "The Future of CES in an AI-Powered Support World",
  ],
  'ccaip': [
    "What is CCAIP (Contact Center AI Platform) — A Complete Overview",
    "CCAIP Certification Guide: What to Study and How to Prepare",
    "Google Cloud Contact Center AI: Architecture and Components",
    "Agent Assist: How AI Helps Human Agents in Real-Time",
    "CCAIP Insights: Speech Analytics and Conversation Intelligence",
    "Omnichannel in CCAIP: Voice, Chat, Email, and Social",
    "Workforce Management in AI-Powered Contact Centers",
    "Quality Management with CCAIP: Automated QA",
    "Real-Time Monitoring and Supervisor Dashboards in CCAIP",
    "CCAIP Integration with CRM: Salesforce, ServiceNow, and More",
    "Predictive Routing: Matching Customers to the Right Agent",
    "Skills-Based Routing with AI Intelligence",
    "Speech-to-Text and Text-to-Speech in CCAIP",
    "Sentiment Analysis and Emotion Detection in Contact Centers",
    "Post-Call Summarization with Generative AI",
    "CCAIP Security: Compliance, Privacy, and Data Protection",
    "Contact Center Automation ROI: How to Build the Business Case",
    "CCAIP Deployment Models: Cloud, Hybrid, On-Premise",
    "Disaster Recovery and Business Continuity in CCAIP",
    "Average Handle Time (AHT): AI Strategies to Reduce It",
    "First Contact Resolution (FCR) with CCAIP Features",
    "Customer Lifetime Value and AI-Powered Contact Centers",
    "Churn Prediction and Proactive Outreach in CCAIP",
    "Agent Training and Coaching with AI Insights",
    "CCAIP Reporting: KPIs Every Manager Must Track",
    "CCAIP vs CCaaS: Understanding the Difference",
    "AI Hallucinations in Contact Centers: Risks and Mitigation",
    "Large Language Models in Customer Service: Use Cases",
    "CCAIP Exam Tips: Common Question Patterns and Pitfalls",
    "The Future of CCAIP: Trends Shaping 2025 and Beyond",
  ],
};

function getCurrentCategory() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (let i = CATEGORY_SCHEDULE.length - 1; i >= 0; i--) {
    if (ym >= CATEGORY_SCHEDULE[i].startMonth) return CATEGORY_SCHEDULE[i];
  }
  return CATEGORY_SCHEDULE[0];
}

function getTodaysTopic(categoryId) {
  const topics = TOPICS[categoryId];
  const dayOfMonth = new Date().getDate() - 1;
  return topics[dayOfMonth % topics.length];
}

function createSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 60).replace(/-$/, '');
}

// Topic-specific fallback images — each topic gets a unique relevant image
const TOPIC_FALLBACK_IMAGES = {
  // Dialogflow CX
  'analytics':        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&auto=format&fit=crop', // data dashboard
  'conversation':     'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=1080&auto=format&fit=crop', // chat bubbles
  'chatbot':          'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1080&auto=format&fit=crop', // robot/AI
  'voice':            'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1080&auto=format&fit=crop', // microphone
  'security':         'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1080&auto=format&fit=crop', // security lock
  'integration':      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1080&auto=format&fit=crop', // network connections
  'testing':          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080&auto=format&fit=crop', // testing/debugging
  'webhook':          'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1080&auto=format&fit=crop', // code/API
  'nlp':              'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1080&auto=format&fit=crop', // AI brain
  'fallback':         'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1080&auto=format&fit=crop', // customer support
  // Contact Center / CCAIP
  'contact-center':   'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1080&auto=format&fit=crop', // call center agents
  'agent':            'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1080&auto=format&fit=crop', // headset agent
  'routing':          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080&auto=format&fit=crop', // network routing
  'sentiment':        'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=1080&auto=format&fit=crop', // feedback emotion
  'automation':       'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1080&auto=format&fit=crop', // robot automation
  // CES / Customer Experience
  'customer':         'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1080&auto=format&fit=crop', // customer service
  'survey':           'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1080&auto=format&fit=crop', // survey/feedback
  'satisfaction':     'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1080&auto=format&fit=crop', // happy customer
  'dashboard':        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&auto=format&fit=crop', // analytics dashboard
  'default':          'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1080&auto=format&fit=crop', // generic tech workspace
};

/** Pick a topic-specific fallback image based on keywords in the query */
function getTopicFallback(topicQuery) {
  const q = (topicQuery || '').toLowerCase();
  for (const [keyword, url] of Object.entries(TOPIC_FALLBACK_IMAGES)) {
    if (keyword !== 'default' && q.includes(keyword)) return url;
  }
  // Secondary pass — match partial words
  if (q.includes('analyt') || q.includes('history') || q.includes('insight')) return TOPIC_FALLBACK_IMAGES['analytics'];
  if (q.includes('chat') || q.includes('dialog') || q.includes('intent')) return TOPIC_FALLBACK_IMAGES['conversation'];
  if (q.includes('voice') || q.includes('speech') || q.includes('ivr') || q.includes('telephon')) return TOPIC_FALLBACK_IMAGES['voice'];
  if (q.includes('secure') || q.includes('access') || q.includes('auth') || q.includes('privacy')) return TOPIC_FALLBACK_IMAGES['security'];
  if (q.includes('webhook') || q.includes('api') || q.includes('integrat') || q.includes('code')) return TOPIC_FALLBACK_IMAGES['webhook'];
  if (q.includes('test') || q.includes('debug') || q.includes('qa')) return TOPIC_FALLBACK_IMAGES['testing'];
  if (q.includes('agent') || q.includes('headset') || q.includes('support')) return TOPIC_FALLBACK_IMAGES['agent'];
  if (q.includes('sentiment') || q.includes('emotion') || q.includes('feeling')) return TOPIC_FALLBACK_IMAGES['sentiment'];
  if (q.includes('automat') || q.includes('bot') || q.includes('robot') || q.includes('ai')) return TOPIC_FALLBACK_IMAGES['automation'];
  if (q.includes('customer') || q.includes('satisfaction') || q.includes('effort') || q.includes('ces')) return TOPIC_FALLBACK_IMAGES['customer'];
  if (q.includes('contact center') || q.includes('ccaip') || q.includes('call center')) return TOPIC_FALLBACK_IMAGES['contact-center'];
  return TOPIC_FALLBACK_IMAGES['default'];
}

async function fetchUnsplashImage(topicQuery, fallbackQuery, usedImages) {
  const key = process.env.UNSPLASH_ACCESS_KEY;

  // No API key — use topic-specific fallback (skip if already used)
  if (!key || key.startsWith('your-')) {
    const fallbacks = Object.values(TOPIC_FALLBACK_IMAGES).filter(url => !usedImages.has(url));
    const preferred = getTopicFallback(topicQuery);
    const img = !usedImages.has(preferred) ? preferred : (fallbacks[0] || preferred);
    console.log(`🖼️  No Unsplash key — topic fallback: "${topicQuery}"`);
    return img;
  }

  // With Unsplash API — fetch more results and skip already-used images
  for (const q of [topicQuery, fallbackQuery, 'contact center AI technology', 'artificial intelligence business']) {
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&orientation=landscape&client_id=${key}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length > 0) {
        // Filter out images already used in previous articles
        const fresh = data.results.filter(r => !usedImages.has(r.urls.regular));
        const pool  = fresh.length > 0 ? fresh : data.results; // fallback to all if all used
        const pick  = pool[Math.floor(Math.random() * Math.min(5, pool.length))];
        console.log(`🖼️  Unsplash query: "${q}" | fresh: ${fresh.length}/${data.results.length}`);
        return pick.urls.regular;
      }
    } catch (e) { console.warn(`⚠️ Unsplash:`, e.message); }
  }
  return getTopicFallback(topicQuery);
}

async function generateArticle(topic, category) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) throw new Error('GEMINI_API_KEY missing');
  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a world-class ${category.name} expert. Teach someone with ZERO knowledge about: "${topic}"

Return ONLY valid JSON (no markdown, no backticks):
{
  "title": "Engaging specific article title",
  "summary": "One sentence: what the reader will learn",
  "imageQuery": "3-4 words for Unsplash that visually represents THIS specific topic",
  "content": "Full article HTML with <h2><h3><p><ul><li><strong>. Min 700 words. Intro, 2-3 core concepts with real examples, real-world company example with numbers, key takeaways.",
  "realWorldExample": "2-3 sentences: real company + what they did + measurable results",
  "keyPoints": ["Takeaway 1","Takeaway 2","Takeaway 3","Takeaway 4","Takeaway 5"],
  "quiz": [
    {"question": "Question directly from this article","options": ["A. option","B. option","C. option","D. option"],"answer": "A"},
    {"question": "Another question from this article","options": ["A. option","B. option","C. option","D. option"],"answer": "B"}
  ],
  "tags": ["${category.id}", "contact-center", "ai"]
}`;

  return withRetry(async () => {
    const response = await client.models.generateContent({ model: MODEL, contents: prompt });
    let text = response.text.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    try { return JSON.parse(text); }
    catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error(`JSON parse failed: ${e.message}`);
    }
  });
}

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');

function loadArticles() {
  try { return JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8')); } catch { return []; }
}

function saveArticles(articles) {
  const dir = path.dirname(ARTICLES_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`💾 articles.json saved — total: ${articles.length}`);
}

async function main() {
  console.log(`\n🚀 CCAIP Blog Generator [PRODUCTION — alternate days]\n`);

  // ── Alternate day gate ──
  if (!isPublishDay()) {
    console.log('📅 Today is a rest day (alternate day schedule).');
    console.log('⏭️  Skipping — next publish day is tomorrow.');
    return;
  }

  const now   = new Date();
  const today = (() => {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().split('T')[0];
  })();

  const articles = loadArticles();

  // ── Duplicate guard (date + topic both checked) ──
  if (articles.find(a => a.date === today)) {
    console.log('✅ Already published today (date match). Skipping.');
    return;
  }

  // ── Load persistent state ──
  const state = readState();
  console.log(`📂 State loaded — lastIndex=${state.lastPublishedIndex}, pending=${state.pendingTopics.length}`);

  // ── Resolve topic ──
  // Priority 1: retry first failed pending topic
  // Priority 2: next topic by lastPublishedIndex
  let topic, category, isRetry = false;

  if (state.pendingTopics.length > 0) {
    const pending = state.pendingTopics[0];
    // Skip if stuck for more than 3 days — move on to next topic
    const daysSinceFail = Math.floor((Date.now() - new Date(pending.failedAt).getTime()) / (1000*60*60*24));
    if (daysSinceFail > 3) {
      console.log(`⏭️  Pending topic stuck for ${daysSinceFail} days — skipping: "${pending.topic}"`);
      state.pendingTopics.shift(); // Remove stuck topic
      state.lastPublishedIndex = (state.lastPublishedIndex + 1) % TOPICS[getCurrentCategory().id].length;
      writeState(state);
    }
  }

  if (state.pendingTopics.length > 0) {
    const pending = state.pendingTopics[0];
    category = CATEGORY_SCHEDULE.find(c => c.id === pending.categoryId) || getCurrentCategory();
    topic    = pending.topic;
    isRetry  = true;
    console.log(`🔄 Retrying failed topic: "${topic}" (failed ${pending.failedAt})`);
  } else {
    category = getCurrentCategory();
    const topics    = TOPICS[category.id];
    const nextIndex = (state.lastPublishedIndex + 1) % topics.length;
    topic = topics[nextIndex];

    // ── Extra duplicate guard: skip if this topic slug was already published ──
    const topicSlug = `${createSlug(topic)}`;
    const alreadyPublished = articles.find(a => a.slug && a.slug.includes(topicSlug));
    if (alreadyPublished) {
      console.log(`⏭️  Topic already published ("${topic}") on ${alreadyPublished.date} — advancing index.`);
      state.lastPublishedIndex = nextIndex;
      writeState(state);
      // Try the next topic immediately
      const nextNext = (nextIndex + 1) % topics.length;
      topic = topics[nextNext];
      console.log(`📌 Moved to next topic: "${topic}" [index ${nextNext}]`);
    }

    console.log(`📅 Date     : ${today} (PUBLISH DAY ✅)`);
    console.log(`📂 Category : ${category.name}`);
    console.log(`📌 Topic    : "${topic}"`);
    console.log(`🤖 Model    : ${MODEL}`);
  }

  const slug = `${today}-${createSlug(topic)}`;

  // ── Generate article (with exponential backoff) ──
  let data;
  try {
    data = await generateArticle(topic, category);
    console.log(`✅ Article generated: "${data.title}"`);
  } catch (err) {
    console.log(`⚠️  Gemini API failed after all retries: ${err.message.substring(0, 120)}`);

    // Add to pendingTopics if not already there
    const alreadyPending = state.pendingTopics.some(p => p.topic === topic);
    if (!alreadyPending) {
      state.pendingTopics.push({ topic, categoryId: category.id, failedAt: today });
      writeState(state);
      console.log(`📌 Topic saved to pendingTopics — will retry next publish day.`);
    } else {
      console.log(`📅 Topic already in pendingTopics — will keep retrying.`);
    }
    return;
  }

  // ── Load used images to avoid repeats ──
  const usedImages = loadUsedImages();
  // Also seed from existing articles.json images
  articles.forEach(a => { if (a.image) usedImages.add(a.image); });

  const imageUrl = await fetchUnsplashImage(data.imageQuery, category.imageQuery, usedImages);

  const article = {
    id: slug, slug,
    title: data.title, date: today,
    category: category.id, categoryName: category.name,
    categoryEmoji: category.emoji, categoryColor: category.color,
    summary: data.summary, content: data.content,
    realWorldExample: data.realWorldExample,
    keyPoints: data.keyPoints || [],
    image: imageUrl,
    tags: data.tags || [category.id],
    quiz: (data.quiz || []).slice(0, 2),
  };

  // ── Check article content uniqueness (slug-based) ──
  const dupCheck = articles.find(a => a.slug === article.slug || a.title === article.title);
  if (dupCheck) {
    console.log(`⚠️  Duplicate article detected (slug/title match "${dupCheck.slug}") — aborting save.`);
    return;
  }

  articles.unshift(article);
  saveArticles(articles);

  // ── Track used image ──
  usedImages.add(imageUrl);
  saveUsedImages(usedImages);
  console.log(`🖼️  Image tracked (${usedImages.size} total used)`);

  // ── Update state on success ──
  if (isRetry) {
    // Remove the retried topic from pendingTopics
    state.pendingTopics = state.pendingTopics.filter(p => p.topic !== topic);
  } else {
    // Advance the index
    const topics = TOPICS[category.id];
    state.lastPublishedIndex = (state.lastPublishedIndex + 1) % topics.length;
  }
  writeState(state);

  await supabaseInsert('articles', {
    id: slug, slug, title: data.title, date: today,
    category: category.id, category_name: category.name,
    summary: data.summary, content: data.content,
    real_world_example: data.realWorldExample,
    key_points: data.keyPoints || [],
    tags: data.tags || [category.id],
    quiz: (data.quiz || []).slice(0, 2),
    created_at: now.toISOString(),
  });

  await supabaseInsert('article_images', {
    article_id: slug,
    image_url: imageUrl,
    image_query: data.imageQuery || category.imageQuery,
    source: 'unsplash',
    created_at: now.toISOString(),
  });

  const mdDir = path.join(process.cwd(), 'content', 'articles', 'en');
  if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
  fs.writeFileSync(
    path.join(mdDir, `${slug}.md`),
    `---\ntitle: "${data.title}"\ndate: ${today}\ncategory: ${category.id}\n---\n\n${data.content.replace(/<[^>]+>/g, '')}`,
    'utf8'
  );

  console.log(`\n🎉 Published: "${article.title}"`);
  console.log(`🔗 /en/blog/${slug}\n`);
}

main().catch(err => {
  console.log(`⚠️  Unexpected error: ${err.message}`);
  console.log(`⏭️  Workflow continuing safely.`);
  process.exit(0);
});
