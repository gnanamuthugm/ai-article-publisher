const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

// ============================================================
// CCAIP Daily Article Generator
// - Picks a daily rotating topic from the list below
// - Generates full article + quiz via Gemini AI
// - Fetches a UNIQUE, CONTENT-BASED image via Unsplash
//   ✅ FIX 1: No more random pick — always best match (index 0)
//   ✅ FIX 2: imageQuery built from article title + content keywords
//   ✅ FIX 3: Used image URLs tracked to prevent repeats
// - Updates data/articles.json (used by the website)
// ============================================================

// 100+ CCAIP-specific topics - ONLY Contact Center AI and Conversational AI topics
const CCAIP_TOPICS = [
  "CCAIP Fundamentals - Complete Overview",
  "Contact Center AI vs Traditional IVR Systems",
  "Dialogflow CX Essentials for Contact Centers",
  "Google CCAI Platform Architecture",
  "Conversational AI in Customer Service",
  "Voice Bots vs Chatbots in Contact Centers",
  "IVR Modernization with AI Integration",
  "Contact Center Queue Management with AI",
  "Skills-Based Routing with Machine Learning",
  "Predictive Routing in Contact Centers",
  "Agent Assist AI Tools and Implementation",
  "Real-Time Agent Guidance Systems",
  "Supervisor Workspaces and Monitoring",
  "Contact Center Analytics and Reporting",
  "Customer Journey Mapping in CCAIP",
  "Omnichannel Customer Experience Strategy",
  "Digital Channel Integration - Email, Chat, Social",
  "Webhooks in Contact Center Integrations",
  "API Integration for Contact Center Platforms",
  "SLA Management in AI-Powered Contact Centers",
  "Service Level Agreements - Implementation and Monitoring",
  "Customer Support Automation Strategies",
  "Self-Service Portals and AI Integration",
  "Knowledge Base Management for Contact Centers",
  "Intent Recognition in Conversational Flows",
  "Entity Extraction in Customer Conversations",
  "Natural Language Processing for Contact Centers",
  "Speech-to-Text in Real-Time Customer Service",
  "Text-to-Speech for Contact Center Applications",
  "Voice Biometrics and Authentication Systems",
  "Sentiment Analysis in Customer Interactions",
  "Emotion AI for Customer Experience",
  "Customer Effort Score (CES) Optimization",
  "First Call Resolution (FCR) with AI",
  "Average Handle Time (AHT) Reduction",
  "After-Call Work (ACW) Automation",
  "Call Wrap-Up Time Optimization",
  "Customer Satisfaction (CSAT) Measurement",
  "Net Promoter Score (NPS) in Contact Centers",
  "Customer Lifetime Value (CLV) Strategies",
  "Contact Center KPIs and Metrics",
  "Workforce Management (WFM) with AI",
  "Quality Management (QM) Automation",
  "Call Recording and Compliance",
  "Data Privacy in Contact Center AI",
  "GDPR Compliance for Contact Centers",
  "CCPA Impact on Customer Data",
  "Contact Center as a Service (CCaaS)",
  "Cloud vs On-Premise Contact Centers",
  "Hybrid Contact Center Models",
  "Multi-Tenant Contact Center Architecture",
  "Scalability in Contact Center AI",
  "Contact Center Disaster Recovery",
  "Business Continuity Planning",
  "Contact Center ROI Calculation",
  "AI Implementation Cost-Benefit Analysis",
  "Building Business Case for CCAIP",
  "Contact Center AI Vendor Selection",
  "Google Cloud AI Contact Center Features",
  "Amazon Connect AI Capabilities",
  "Microsoft Azure Contact Center Solutions",
  "Five9 AI Integration",
  "Genesys AI Platform",
  "Twilio Contact Center AI",
  "Vonage Contact Center AI Features",
  "Avaya AI-Powered Contact Centers",
  "Cisco Contact Center AI Solutions",
  "Talkdesk AI Capabilities",
  "LivePerson Conversational AI",
  "Intercom AI for Customer Service",
  "Zendesk AI Integration",
  "Salesforce Einstein for Service",
  "HubSpot AI for Customer Support",
  "Freshworks AI Contact Center",
  "AI Training Data for Contact Centers",
  "Machine Learning Models for Customer Service",
  "Deep Learning in Conversational AI",
  "Large Language Models in Contact Centers",
  "GPT Integration in Customer Service",
  "BERT for Customer Intent Classification",
  "Transformer Models in Contact Centers",
  "AI Hallucination Risks in Customer Service",
  "AI Ethics in Contact Center Operations",
  "Bias in AI Customer Service Systems",
  "Explainable AI for Contact Centers",
  "Contact Center AI Testing and Validation",
  "AI Model Monitoring and Maintenance",
  "Continuous Learning in Contact Center AI",
  "A/B Testing for AI Customer Service",
  "Contact Center AI Performance Metrics",
  "AI Model Accuracy in Customer Service",
  "False Positive Reduction in AI Systems",
  "Contact Center AI Security Best Practices",
  "Cybersecurity in AI-Powered Contact Centers",
  "Fraud Detection in Contact Center AI",
  "Voice Cloning and Deepfake Protection",
  "Contact Center AI Future Trends",
  "2025 Contact Center AI Predictions",
  "Emerging Technologies in Customer Service",
  "Metaverse and Contact Centers",
  "AR/VR in Customer Support",
  "5G Impact on Contact Center AI",
  "Edge Computing for Contact Centers",
  "Blockchain in Contact Center Operations",
  "IoT Integration with Contact Centers",
  "Contact Center AI Certification Guide",
  "CCAIP Exam Preparation",
  "Google Cloud CCAI Certification",
  "Contact Center AI Training Programs",
  "Skills Development for AI Contact Centers",
];

// Random topic selection from CCAIP topics
function getRandomCCAIPTopic() {
  const randomIndex = Math.floor(Math.random() * CCAIP_TOPICS.length);
  return CCAIP_TOPICS[randomIndex];
}

const CONFIG = {
  articlesJsonPath: path.join(process.cwd(), 'data', 'articles.json'),
  contentDir: path.join(process.cwd(), 'content', 'articles'),
  usedImagesPath: path.join(process.cwd(), 'data', 'used-images.json'),
  model: 'gemini-2.5-flash',
};

// ── Pick today's topic (cycles through the list by day-of-year) ──
function getTodaysTopic() {
  const start = new Date('2026-01-01');
  const today = new Date();
  const dayIndex = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return CCAIP_TOPICS[dayIndex % CCAIP_TOPICS.length];
}

// ─────────────────────────────────────────────────────────────
// FIX 3: Used image tracker — load / save / check
// Tracks Unsplash photo IDs (not full URLs) to avoid repeats
// ─────────────────────────────────────────────────────────────
function loadUsedImages() {
  try {
    const raw = fs.readFileSync(CONFIG.usedImagesPath, 'utf8');
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveUsedImages(usedSet) {
  const dir = path.dirname(CONFIG.usedImagesPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG.usedImagesPath, JSON.stringify([...usedSet], null, 2), 'utf8');
}

// Extract Unsplash photo ID from URL  e.g. "photo-1234567890-abcdef"
function extractUnsplashId(url) {
  const match = url.match(/photo-[a-zA-Z0-9_-]+/);
  return match ? match[0] : url;
}

// ─────────────────────────────────────────────────────────────
// FIX 2: Build a rich image query from title + content keywords
// Gemini still provides imageQuery, but we ENHANCE it using
// the article title and key h2 headings extracted from content
// ─────────────────────────────────────────────────────────────
function buildEnhancedImageQuery(title, content, geminiQuery) {
  // Extract h2 headings from HTML content to find core topics
  const headings = [];
  const h2Matches = content.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
  for (const m of h2Matches) {
    const clean = m[1].replace(/<[^>]+>/g, '').trim();
    if (clean.length > 3 && clean.length < 60) headings.push(clean);
  }

  // Strip HTML from title for clean keywords
  const cleanTitle = title.replace(/<[^>]+>/g, '').trim();

  // Priority logic:
  // 1. If Gemini gave a specific imageQuery (not generic), use it as-is → it's the best
  // 2. Otherwise derive from title keywords
  const genericTerms = ['contact center technology', 'ai customer support', 'customer service', 'contact center ai'];
  const isGeneric = genericTerms.some(g => geminiQuery.toLowerCase().includes(g));

  if (geminiQuery && !isGeneric) {
    console.log(`🔍 Using Gemini imageQuery: "${geminiQuery}"`);
    return geminiQuery;
  }

  // Derive from title: take first 4 meaningful words
  const stopWords = new Set(['the', 'a', 'an', 'in', 'for', 'of', 'and', 'or', 'with', 'to', 'at', 'by', 'on']);
  const titleWords = cleanTitle.toLowerCase().split(/\s+/).filter(w => !stopWords.has(w) && w.length > 2);
  const derived = titleWords.slice(0, 4).join(' ');

  console.log(`🔍 Derived imageQuery from title: "${derived}"`);
  return derived;
}

// ─────────────────────────────────────────────────────────────
// FIX 1 + FIX 3: Fetch best, non-repeated image from Unsplash
// - FIX 1: picks index 0 (best match), NOT random
// - FIX 3: skips already-used photo IDs
// ─────────────────────────────────────────────────────────────
async function fetchUnsplashImage(primaryQuery, topicFallback, usedImages) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || key === 'your-unsplash-key') {
    console.warn('⚠️  No Unsplash key, using placeholder image');
    return 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop';
  }

  // Build a prioritised list of queries — most specific first, NO generic fallback last
  const queries = [
    primaryQuery,                          // Enhanced / Gemini-specific query
    topicFallback,                         // Raw topic title
    `${topicFallback} technology`,         // Topic + "technology"
    `${topicFallback} software`,           // Topic + "software"
    'artificial intelligence workplace',   // Better generic than "contact center ai"
  ].filter(Boolean).map(q => q.trim()).filter(q => q.length > 2);

  // Deduplicate queries
  const seen = new Set();
  const uniqueQueries = queries.filter(q => {
    if (seen.has(q.toLowerCase())) return false;
    seen.add(q.toLowerCase());
    return true;
  });

  for (const q of uniqueQueries) {
    try {
      // Fetch more results (10) so we have room to skip duplicates
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=10&orientation=landscape&client_id=${key}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        console.warn(`⚠️  No results for query "${q}", trying next...`);
        continue;
      }

      // FIX 1 + FIX 3: iterate from index 0 (best match), skip used images
      for (const img of data.results) {
        const photoId = extractUnsplashId(img.urls.regular);
        if (usedImages.has(photoId)) {
          console.log(`⏭️  Skipping already-used image: ${photoId}`);
          continue;
        }
        // Found a fresh, best-match image!
        console.log(`🖼️  Image selected (query="${q}", id=${photoId}): ${img.urls.regular}`);
        return img.urls.regular;
      }

      console.warn(`⚠️  All images for query "${q}" already used, trying next query...`);
    } catch (e) {
      console.warn(`⚠️  Unsplash fetch failed for "${q}": ${e.message}`);
    }
  }

  // Hard fallback — only if literally everything is exhausted
  console.warn('⚠️  All queries exhausted, using fallback placeholder');
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

// ── Generate article JSON via Gemini ──
async function generateArticleJSON(topic) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-key-here') {
    throw new Error('GEMINI_API_KEY missing in .env.local');
  }

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a CCAIP (Contact Center AI Platform) expert and educator specializing ONLY in Contact Center AI and Conversational AI topics.

IMPORTANT RESTRICTIONS:
- Generate content ONLY about Contact Center AI, Conversational AI, IVR, Voice Bots, Chatbots, Dialogflow CX, Queue Management, Agent Routing, SLA, Customer Support Automation, and related contact center technologies.
- DO NOT generate content about React, JavaScript, frontend development, web development, software engineering, or general programming topics.
- Focus exclusively on customer service automation, contact center operations, and AI-powered customer interactions.

Generate a professional technical blog article about: "${topic}"

The article should be written in a professional technical blog style suitable for CCAIP professionals and contact center managers.

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "title": "Professional technical article title focusing on CCAIP",
  "summary": "One sentence summary of what CCAIP professionals will learn",
  "content": "Full HTML article body (use <h2>, <p>, <ul>, <li>, <strong> tags). Must include: Introduction, 3-5 Key Concepts with detailed explanations, Real-world Implementation Strategy, Performance Metrics and ROI analysis. Minimum 800 words. Focus on practical contact center applications.",
  "realWorldExample": "A specific real-world example (2-3 sentences) showing how a contact center implemented this CCAIP solution with measurable results",
  "keyPoints": [
    "Key CCAIP takeaway 1",
    "Key CCAIP takeaway 2",
    "Key CCAIP takeaway 3",
    "Key CCAIP takeaway 4",
    "Key CCAIP takeaway 5"
  ],
  "imageQuery": "A highly specific 3-5 word Unsplash search query that DIRECTLY and VISUALLY represents the exact topic '${topic}'. Think: what image would a journalist use to illustrate this article? Examples: 'sentiment analysis dashboard', 'voice recognition waveform', 'workforce scheduling software', 'fraud alert security screen', 'cloud computing server room', 'customer support headset agent'. NEVER use generic terms like 'contact center technology', 'ai customer support', or 'customer service'. The query must reflect the specific visual subject of this article.",
  "tags": ["ccaip", "contact-center-ai", "conversational-ai"],
  "quiz": [
    {
      "question": "Technical question about CCAIP implementation?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "A"
    },
    {
      "question": "Question about contact center AI best practices?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "B"
    },
    {
      "question": "Question about conversational AI in customer service?",
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

// ── Save multilingual markdown backup ──
function saveMultilingualMarkdown(topic, articleData) {
  const today = new Date().toISOString().split('T')[0];
  const slug = createSlug(topic);
  const cleanContent = articleData.content.replace(/<[^>]+>/g, '');

  const languages = ['en', 'ta', 'hi', 'te'];

  languages.forEach(lang => {
    const langDir = path.join(CONFIG.contentDir, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    const filepath = path.join(langDir, `${slug}.md`);

    const md = `---
title: "${articleData.title}"
description: "${articleData.summary}"
author: "CCAIP Daily"
publishedAt: "${today}"
category: "technology"
tags: ${JSON.stringify(articleData.tags || ['ccaip', 'contact-center-ai'])}
---

${cleanContent}
`;
    fs.writeFileSync(filepath, md, 'utf8');
    console.log(`📄 Markdown saved (${lang}): ${path.basename(filepath)}`);
  });
}

// ── Main ──
async function main() {
  console.log('\n🚀 CCAIP Daily Article Generator Starting...\n');

  const topic = getRandomCCAIPTopic();
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

  // 1. Generate article content via Gemini
  const articleData = await generateArticleJSON(topic);
  console.log(`✅ Article generated: "${articleData.title}"`);

  // 2. Load used images tracker (FIX 3)
  const usedImages = loadUsedImages();
  console.log(`📋 Already used images tracked: ${usedImages.size}`);

  // 3. Build the best image query from title + content + Gemini hint (FIX 2)
  const primaryQuery = buildEnhancedImageQuery(
    articleData.title,
    articleData.content,
    articleData.imageQuery || ''
  );

  // 4. Fetch image — best match, no random, no repeats (FIX 1 + FIX 3)
  const imageUrl = await fetchUnsplashImage(primaryQuery, topic, usedImages);

  // 5. Mark this image as used and save tracker (FIX 3)
  const usedPhotoId = extractUnsplashId(imageUrl);
  usedImages.add(usedPhotoId);
  saveUsedImages(usedImages);
  console.log(`✅ Image marked as used: ${usedPhotoId}`);

  // 6. Build article record
  const newArticle = {
    id: slug,
    slug: slug,
    title: articleData.title,
    date: today,
    summary: articleData.summary,
    content: articleData.content,
    realWorldExample: articleData.realWorldExample,
    keyPoints: articleData.keyPoints || [],
    image: imageUrl,
    tags: articleData.tags || ['ccaip', 'contact-center'],
    quiz: articleData.quiz || [],
  };

  // 7. Prepend new article (newest first)
  articles.unshift(newArticle);

  // 8. Save articles.json
  saveArticles(articles);

  // 9. Save markdown backup in multiple languages
  saveMultilingualMarkdown(topic, articleData);

  console.log(`\n✅ Done! Article "${newArticle.title}" added to website.`);
  console.log(`🖼️  Image: ${imageUrl}\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
