const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

// ============================================================
// CCAIP Daily Blog Generator — v3.1
// Categories: Dialogflow CX → Conversational Agents Playbook
//             → CES → CCAIP (monthly rotation)
// Publishes: 11:30 AM IST (6:00 AM UTC) daily via GitHub Actions
// Model: gemini-1.5-flash (1500 req/day free tier)
// ============================================================

// --- Category Schedule ---
const CATEGORY_SCHEDULE = [
  {
    id: 'dialogflow-cx',
    name: 'Dialogflow CX',
    emoji: '🤖',
    color: 'blue',
    description: 'Master Google Dialogflow CX — build advanced conversational flows',
    startMonth: '2026-04',
  },
  {
    id: 'conversational-agents-playbook',
    name: 'Conversational Agents Playbook',
    emoji: '📖',
    color: 'purple',
    description: 'Step-by-step playbooks for building production-grade conversational agents',
    startMonth: '2026-05',
  },
  {
    id: 'ces',
    name: 'Customer Effort Score',
    emoji: '⭐',
    color: 'green',
    description: 'Reduce customer effort, increase loyalty with CES strategies',
    startMonth: '2026-06',
  },
  {
    id: 'ccaip',
    name: 'CCAIP',
    emoji: '🎯',
    color: 'orange',
    description: 'Contact Center AI Platform — comprehensive exam and implementation guide',
    startMonth: '2026-07',
  },
];

// --- Topics per Category ---
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
    "Publishing and Environment Management",
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
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (let i = CATEGORY_SCHEDULE.length - 1; i >= 0; i--) {
    if (currentYearMonth >= CATEGORY_SCHEDULE[i].startMonth) {
      const idx = i % CATEGORY_SCHEDULE.length;
      return CATEGORY_SCHEDULE[idx];
    }
  }
  return CATEGORY_SCHEDULE[0];
}

function getTodaysTopic(categoryId) {
  const topics = TOPICS[categoryId];
  const dayOfMonth = new Date().getDate() - 1;
  return topics[dayOfMonth % topics.length];
}

function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 70)
    .replace(/-$/, '');
}

async function fetchUnsplashImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const fallback = 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1080&auto=format&fit=crop';
  if (!key || key.startsWith('your-')) {
    console.warn('⚠️  No Unsplash key, using fallback image');
    return fallback;
  }
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&client_id=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const data = await res.json();
    if (data.results?.length > 0) {
      const pick = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
      console.log(`🖼️  Image: ${pick.urls.regular}`);
      return pick.urls.regular;
    }
  } catch (e) {
    console.warn('⚠️  Unsplash error:', e.message);
  }
  return fallback;
}

async function generateArticle(topic, category) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) throw new Error('GEMINI_API_KEY missing');

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a world-class ${category.name} expert and educator. Your goal is to teach beginners — someone with ZERO knowledge — about this topic in a way that is clear, engaging, and immediately useful.

Write a complete daily learning blog article about: "${topic}"
Category: ${category.name}

VERY IMPORTANT RULES:
1. Write as if explaining to someone who has never heard of this before
2. Use simple, clear language — no unnecessary jargon without explanation
3. Every concept must have a real-world analogy or example
4. The content must be deep enough to be genuinely useful to a professional
5. Include EXACTLY 2 quiz questions — no more, no less
6. The quiz answers must be LOCKED (user cannot change after submission)

Return ONLY a valid JSON object. No markdown fences, no extra text. Just the raw JSON:

{
  "title": "Engaging, specific article title (not generic)",
  "summary": "One sentence: what the reader will understand after reading this",
  "imageQuery": "3-4 word Unsplash search query (e.g. 'customer service ai', 'contact center office')",
  "content": "Full article as HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. Structure: Introduction (explain what this is in simple terms + why it matters), Core Concepts (2-3 sections with real examples), Real-World Example (specific company or scenario with numbers), Key Takeaways summary. Minimum 700 words total.",
  "realWorldExample": "2-3 sentences: a specific real company or scenario showing this concept in action with measurable results",
  "keyPoints": [
    "Takeaway 1 (specific, actionable)",
    "Takeaway 2 (specific, actionable)",
    "Takeaway 3 (specific, actionable)",
    "Takeaway 4 (specific, actionable)",
    "Takeaway 5 (specific, actionable)"
  ],
  "quiz": [
    {
      "question": "Clear, specific question testing understanding of the article",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "answer": "A"
    },
    {
      "question": "Another clear question from a different concept in the article",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "answer": "B"
    }
  ],
  "tags": ["${category.id}", "tag2", "tag3"]
}`;

  console.log(`🤖 Generating article: "${topic}"`);
  // Using gemini-1.5-flash — 1500 req/day free tier (vs gemini-2.5-flash 20 req/day)
  const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  let text = response.text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`JSON parse failed: ${e.message}`);
  }
}

const ARTICLES_PATH = path.join(process.cwd(), 'data', 'articles.json');

function loadArticles() {
  try {
    return JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveArticles(articles) {
  fs.writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`💾 articles.json updated — total: ${articles.length} articles`);
}

async function main() {
  console.log('\n🚀 CCAIP Daily Blog Generator v3.1\n');

  const today = new Date().toISOString().split('T')[0];
  const category = getCurrentCategory();
  const topic = getTodaysTopic(category.id);
  const slug = `${today}-${createSlug(topic)}`;

  console.log(`📅 Date       : ${today}`);
  console.log(`📂 Category   : ${category.name}`);
  console.log(`📌 Topic      : "${topic}"`);
  console.log(`🤖 Model      : gemini-1.5-flash (1500 req/day free)`);

  const articles = loadArticles();
  if (articles.find(a => a.date === today)) {
    console.log('✅ Article already published today. Skipping.');
    return;
  }

  const data = await generateArticle(topic, category);
  console.log(`✅ Article generated: "${data.title}"`);

  const image = await fetchUnsplashImage(data.imageQuery || topic);

  const article = {
    id: slug,
    slug,
    title: data.title,
    date: today,
    category: category.id,
    categoryName: category.name,
    categoryEmoji: category.emoji,
    categoryColor: category.color,
    summary: data.summary,
    content: data.content,
    realWorldExample: data.realWorldExample,
    keyPoints: data.keyPoints || [],
    image,
    tags: data.tags || [category.id],
    quiz: (data.quiz || []).slice(0, 2),
  };

  articles.unshift(article);
  saveArticles(articles);

  const mdDir = path.join(process.cwd(), 'content', 'articles', 'en');
  if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
  const mdContent = `---
title: "${data.title}"
date: ${today}
category: ${category.id}
description: "${data.summary}"
author: "CCAIP Daily"
publishedAt: "${today}"
tags: ${JSON.stringify(data.tags || [category.id])}
---

${data.content.replace(/<[^>]+>/g, '')}
`;
  fs.writeFileSync(path.join(mdDir, `${slug}.md`), mdContent, 'utf8');

  console.log(`\n🎉 Published: "${article.title}"`);
  console.log(`🔗 Slug: ${slug}\n`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
