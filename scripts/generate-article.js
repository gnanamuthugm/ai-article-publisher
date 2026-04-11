const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

// ============================================================
// CCAIP Daily Article Generator
// - Picks a daily rotating topic from the list below
// - Generates full article + quiz via Gemini AI
// - Fetches a relevant image via Unsplash
// - Updates data/articles.json (used by the website)
// ============================================================

// 60 CCAIP topics — one per day, cycling automatically
const CCAIP_TOPICS = [
  "IVR vs Conversational AI - Key Differences",
  "What is CCAIP and Why It Matters",
  "Omnichannel vs Multichannel Contact Centers",
  "Role of AI in Modern Contact Centers",
  "Understanding NLP in Customer Service",
  "Speech Analytics in Contact Centers",
  "Agent Assist Tools - How AI Helps Agents",
  "Customer Effort Score (CES) Explained",
  "First Call Resolution (FCR) Best Practices",
  "Real-Time Transcription in Contact Centers",
  "Sentiment Analysis for Customer Interactions",
  "Voice Biometrics and Authentication",
  "Chatbots vs Virtual Agents - Key Differences",
  "Workforce Management (WFM) in CCAIP",
  "Quality Management (QM) in Contact Centers",
  "CRM Integration with Contact Center Platforms",
  "Customer Journey Mapping for Contact Centers",
  "Call Routing Strategies - Skills-Based Routing",
  "Predictive Dialer vs Progressive Dialer",
  "Cloud Contact Center vs On-Premise Solutions",
  "Average Handle Time (AHT) Reduction Strategies",
  "Net Promoter Score (NPS) in Contact Centers",
  "Customer Satisfaction (CSAT) Measurement",
  "Interaction Analytics - Turning Data into Insights",
  "Contact Center as a Service (CCaaS) Overview",
  "Auto Summarization - AI Post-Call Notes",
  "Intent Detection in Conversational AI",
  "Escalation Management in AI-Powered Centers",
  "Digital Channels - Email, Chat, Social Integration",
  "Contact Center KPIs Every Manager Should Know",
  "Self-Service Automation - Reducing Agent Load",
  "Google CCAI Platform Overview",
  "Dialogflow CX - Building Advanced Conversational Flows",
  "Agent Desktop Modernization",
  "Knowledge Base Integration in Contact Centers",
  "Proactive Customer Outreach with AI",
  "Data Privacy and Compliance in Contact Centers",
  "GDPR and CCPA Impact on Contact Centers",
  "Hybrid Work Models in Contact Centers",
  "Call Recording and Compliance",
  "Supervisor Dashboards and Real-Time Monitoring",
  "Coaching and Training with AI Insights",
  "Wrap-Up Time Reduction Strategies",
  "Contact Center Automation ROI Calculation",
  "Multimodal AI in Customer Service",
  "Voice AI vs Text AI in Customer Support",
  "Intelligent Virtual Assistants (IVA) Deep Dive",
  "Emotion AI in Contact Centers",
  "Customer Lifetime Value and Contact Centers",
  "Abandonment Rate - Causes and Solutions",
  "Service Level Agreement (SLA) in Contact Centers",
  "After-Call Work (ACW) Optimization",
  "Blended Agent Model - Voice + Digital",
  "Contact Center Reporting Best Practices",
  "AI Hallucination Risks in Customer Service",
  "Large Language Models in Contact Centers",
  "Google Cloud Contact Center AI Features",
  "CCAIP Certification - What to Study",
  "Future of Contact Centers - 2025 and Beyond",
  "Building a Business Case for CCAIP Investment",
];

const CONFIG = {
  articlesJsonPath: path.join(process.cwd(), 'data', 'articles.json'),
  contentDir: path.join(process.cwd(), 'content', 'articles'),
  model: 'gemini-2.5-flash',
};

// ── Pick today's topic (cycles through the list by day-of-year) ──
function getTodaysTopic() {
  const start = new Date('2026-01-01');
  const today = new Date();
  const dayIndex = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return CCAIP_TOPICS[dayIndex % CCAIP_TOPICS.length];
}

// ── Generate article JSON via Gemini ──
async function generateArticleJSON(topic) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-key-here') {
    throw new Error('GEMINI_API_KEY missing in .env.local');
  }

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a CCAIP (Contact Center AI Platform) expert and educator.

Generate a structured daily learning article about: "${topic}"

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "title": "Engaging article title",
  "summary": "One sentence summary of what the reader will learn today",
  "content": "Full HTML article body (use <h2>, <p>, <ul>, <li>, <strong> tags). Must include: Introduction, 3-5 Key Concepts with explanations, Practical Use Case with measurable results. Minimum 600 words.",
  "realWorldExample": "A specific real-world example (2-3 sentences) showing how a company used this concept",
  "keyPoints": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3",
    "Key takeaway 4",
    "Key takeaway 5"
  ],
  "imageQuery": "A 3-4 word Unsplash search query relevant to the topic (e.g. 'contact center office', 'customer service ai', 'call center technology')",
  "tags": ["tag1", "tag2", "tag3"],
  "quiz": [
    {
      "question": "Question text here?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "A"
    },
    {
      "question": "Question text here?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "B"
    },
    {
      "question": "Question text here?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "C"
    }
  ]
}`;

  console.log(`🤖 Calling Gemini for topic: "${topic}"`);

  const response = await client.models.generateContent({
    model: CONFIG.model,
    contents: prompt,
  });

  let text = response.text.trim();

  // Strip markdown code fences if present
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Raw Gemini response:', text.substring(0, 500));
    throw new Error(`Failed to parse Gemini JSON response: ${e.message}`);
  }
}

// ── Fetch image from Unsplash ──
async function fetchUnsplashImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || key === 'your-unsplash-key') {
    console.warn('⚠️  No Unsplash key, using placeholder image');
    return 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop';
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&client_id=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const img = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
      console.log(`🖼️  Image fetched: ${img.urls.regular}`);
      return img.urls.regular;
    }
  } catch (e) {
    console.warn('⚠️  Unsplash fetch failed:', e.message);
  }

  return 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop';
}

// ── Create slug from title ──
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60)
    .replace(/-+$/, '');
}

// ── Load existing articles.json ──
function loadArticles() {
  try {
    const raw = fs.readFileSync(CONFIG.articlesJsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── Save articles.json ──
function saveArticles(articles) {
  fs.writeFileSync(CONFIG.articlesJsonPath, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`💾 articles.json updated (${articles.length} total articles)`);
}

// ── Save markdown backup ──
function saveMarkdown(topic, articleData) {
  if (!fs.existsSync(CONFIG.contentDir)) {
    fs.mkdirSync(CONFIG.contentDir, { recursive: true });
  }
  const today = new Date().toISOString().split('T')[0];
  const slug = createSlug(topic);
  const filepath = path.join(CONFIG.contentDir, `${today}-${slug}.md`);
  const md = `---
title: "${articleData.title}"
date: ${today}
---

${articleData.content.replace(/<[^>]+>/g, '')}
`;
  fs.writeFileSync(filepath, md, 'utf8');
  console.log(`📄 Markdown saved: ${path.basename(filepath)}`);
}

// ── Main ──
async function main() {
  console.log('\n🚀 CCAIP Daily Article Generator Starting...\n');

  const topic = getTodaysTopic();
  const today = new Date().toISOString().split('T')[0];
  const slug = `${today}-${createSlug(topic)}`;

  console.log(`📌 Today's topic: "${topic}"`);
  console.log(`📅 Date: ${today}`);

  // Check if today's article already exists
  const articles = loadArticles();
  const alreadyExists = articles.find(a => a.slug === slug || a.date === today);
  if (alreadyExists) {
    console.log('✅ Today\'s article already exists. Skipping generation.');
    return;
  }

  // 1. Generate article content
  const articleData = await generateArticleJSON(topic);
  console.log(`✅ Article generated: "${articleData.title}"`);

  // 2. Fetch image
  const imageQuery = articleData.imageQuery || topic;
  const image = await fetchUnsplashImage(imageQuery);

  // 3. Build article record
  const newArticle = {
    id: slug,
    slug: slug,
    title: articleData.title,
    date: today,
    summary: articleData.summary,
    content: articleData.content,
    realWorldExample: articleData.realWorldExample,
    keyPoints: articleData.keyPoints || [],
    image: image,
    tags: articleData.tags || ['ccaip', 'contact-center'],
    quiz: articleData.quiz || [],
  };

  // 4. Prepend new article (newest first)
  articles.unshift(newArticle);

  // 5. Save articles.json
  saveArticles(articles);

  // 6. Save markdown backup
  saveMarkdown(topic, articleData);

  console.log(`\n🎉 Done! Article "${newArticle.title}" added to website.\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
