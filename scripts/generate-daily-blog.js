const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

// ============================================================
// CCAIP Daily Blog Generator — Production
// Model  : gemini-2.0-flash (1500 RPD free tier — avoids 429s)
// Retry  : max 2 attempts, 30s wait between them
// Safety : if both attempts fail → log and skip gracefully
// ============================================================

const MODEL = 'gemini-2.0-flash';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function supabaseInsert(table, record) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(`⚠️  Supabase not configured — skipping ${table}`);
    return;
  }
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

async function fetchUnsplashImage(topicQuery, fallbackQuery) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const fallback = 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1080&auto=format&fit=crop';
  if (!key || key.startsWith('your-')) return fallback;
  for (const q of [topicQuery, fallbackQuery, 'contact center technology']) {
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape&client_id=${key}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length > 0) {
        const pick = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
        console.log(`🖼️  Image query: "${q}"`);
        return pick.urls.regular;
      }
    } catch (e) { console.warn(`⚠️ Unsplash:`, e.message); }
  }
  return fallback;
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

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`Attempt ${attempt}/2`);
      const response = await client.models.generateContent({ model: MODEL, contents: prompt });
      let text = response.text.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      try { return JSON.parse(text); }
      catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error(`JSON parse failed: ${e.message}`);
      }
    } catch (err) {
      const msg = err.message || '';
      const is429or503 = msg.includes('429') || msg.includes('503');
      if (attempt === 1 && is429or503) {
        console.log(`Waiting 30 seconds before retry...`);
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      throw err;
    }
  }
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
  console.log(`\n🚀 CCAIP Blog Generator [PRODUCTION — once per day]\n`);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const category = getCurrentCategory();
  const topic = getTodaysTopic(category.id);
  const slug = `${today}-${createSlug(topic)}`;

  console.log(`📅 Date     : ${today}`);
  console.log(`📂 Category : ${category.name}`);
  console.log(`📌 Topic    : "${topic}"`);
  console.log(`🤖 Model    : ${MODEL}`);

  const articles = loadArticles();

  if (articles.find(a => a.date === today)) {
    console.log('✅ Already published today. Skipping.');
    return;
  }

  let data;
  try {
    data = await generateArticle(topic, category);
    console.log(`✅ Article generated: "${data.title}"`);
  } catch (err) {
    console.log(`⚠️  Gemini API failed: ${err.message.substring(0, 120)}`);
    console.log(`⏭️  Skipping today. Will retry tomorrow at 11:30 AM IST.`);
    return;
  }

  const imageUrl = await fetchUnsplashImage(data.imageQuery, category.imageQuery);

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

  articles.unshift(article);
  saveArticles(articles);

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
