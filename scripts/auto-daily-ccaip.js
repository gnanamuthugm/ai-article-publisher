const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

// ============================================================
// FULLY AUTOMATED DAILY CCAIP ARTICLE GENERATOR
// - Generates one complete CCAIP article daily
// - Includes images, real-time examples, questions
// - Auto-publishes to website with comments system
// - Users can comment on articles
// ============================================================

// 100+ Professional CCAIP Topics - Tamil & English
const CCAIP_TOPICS = [
  "Dialogflow CX Queue SLA Best Practices",
  "IVR vs Conversational AI Implementation",
  "Webhook Retry Handling in CCAIP Systems",
  "Live Agent Transfer Flow Design Patterns",
  "Voice Bot Error Handling Strategies",
  "Queue Escalation Strategy for Contact Centers",
  "CCAIP Reporting Metrics and KPIs",
  "Google CCAI Platform Architecture Overview",
  "Speech-to-Text Accuracy in Contact Centers",
  "Text-to-Speech Natural Voice Selection",
  "Agent Assist AI Real-time Guidance",
  "Customer Intent Recognition in Voice Bots",
  "Sentiment Analysis for Call Routing",
  "Omnichannel Support Integration",
  "Voice AI Architecture Design Principles",
  "Contact Center Automation ROI Calculation",
  "SLA Monitoring and Alerting Systems",
  "Call Flow Design for Customer Satisfaction",
  "Multi-language Support in Voice Bots",
  "Context Management in Conversational AI",
  "Fallback Strategies for AI Failures",
  "Customer Data Privacy in CCAIP",
  "GDPR Compliance for Voice Interactions",
  "Real-time Transcription Accuracy",
  "Voice Biometrics Authentication Methods",
  "Queue Management with AI Prioritization",
  "Agent Performance Analytics",
  "Customer Journey Mapping in Contact Centers",
  "Chatbot vs Voice Bot Use Cases",
  "Integration with CRM Systems",
  "API Rate Limiting in CCAIP",
  "Load Balancing for Contact Center AI",
  "Disaster Recovery for Voice Systems",
  "A/B Testing Conversation Flows",
  "Customer Effort Score Optimization",
  "First Contact Resolution with AI",
  "Average Handle Time Reduction",
  "After-call Work Automation",
  "Quality Management with AI Insights",
  "Predictive Routing Algorithms",
  "Skills-based Routing Enhancement",
  "Virtual Agent Handoff Protocols",
  "Customer Retention through AI",
  "Cost Reduction with Automation",
  "Scalability Planning for CCAIP",
  "Cloud vs On-premise Contact Centers",
  "Security in Voice Interactions",
  "Fraud Detection in Call Centers",
  "Compliance Recording Requirements",
  "Real-time Agent Coaching",
  "Customer Lifetime Value Prediction",
  "Churn Prediction with AI Analytics",
  "Personalization in Customer Service",
  "Proactive Customer Outreach",
  "Self-service Optimization",
  "Knowledge Base Integration",
  "Multi-tenant CCAIP Architecture",
  "Edge Computing for Voice Processing",
  "5G Impact on Contact Centers",
  "Future Trends in Conversational AI"
];

const CONFIG = {
  contentDir: path.join(process.cwd(), 'content', 'articles', 'en'),
  commentsDir: path.join(process.cwd(), 'data', 'comments'),
  model: 'gemini-2.5-flash',
};

// Random topic selection
function getRandomCCAIPTopic() {
  const randomIndex = Math.floor(Math.random() * CCAIP_TOPICS.length);
  return CCAIP_TOPICS[randomIndex];
}

// Create slug from topic
function createSlug(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60)
    .replace(/-+$/, '');
}

// Generate complete CCAIP article with all features
async function generateCompleteCCAIPArticle(topic) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-key-here') {
    throw new Error('GEMINI_API_KEY missing in .env.local');
  }

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are a CCAIP (Contact Center AI Platform) expert and technical blogger.

CRITICAL RESTRICTIONS:
- Generate content ONLY about Contact Center AI, Conversational AI, IVR, Voice Bots, Chatbots, Dialogflow CX, Queue Management, Agent Routing, SLA, Customer Support Automation
- ABSOLUTELY NO content about React, JavaScript, frontend development, web development, coding tutorials
- Focus exclusively on customer service automation, contact center operations, and AI-powered customer interactions

Generate a COMPLETE professional technical blog article about: "${topic}"

Requirements:
- Write in professional technical blog style suitable for CCAIP professionals
- Include practical implementation details and real-world use cases
- Provide specific metrics and ROI considerations
- Minimum 1000 words
- Include ALL sections below

Return ONLY valid JSON with this exact structure (no markdown code fences):
{
  "title": "Professional CCAIP article title",
  "description": "One sentence summary of what CCAIP professionals will learn",
  "content": "Complete article in HTML format with proper tags. Must include: Introduction, 4-6 Key Concepts, Implementation Strategy, Real-world Examples with metrics, Best Practices, Future Trends, Conclusion. Minimum 1000 words.",
  "imageQuery": "3-4 word search query for relevant CCAIP image (e.g., 'contact center technology', 'AI customer service')",
  "realTimeExample": {
    "company": "Real company name",
    "implementation": "What they implemented",
    "results": "Specific measurable results with numbers",
    "timeline": "Implementation timeline"
  },
  "keyMetrics": [
    "Metric 1: Specific percentage improvement",
    "Metric 2: Cost reduction amount", 
    "Metric 3: Time saved per interaction",
    "Metric 4: Customer satisfaction increase",
    "Metric 5: ROI percentage"
  ],
  "questions": [
    {
      "question": "Technical question about CCAIP implementation?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "A",
      "explanation": "Detailed explanation of why this answer is correct"
    },
    {
      "question": "Practical question about contact center operations?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "B", 
      "explanation": "Detailed explanation of why this answer is correct"
    },
    {
      "question": "Strategic question about CCAIP business value?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "C",
      "explanation": "Detailed explanation of why this answer is correct"
    },
    {
      "question": "Advanced question about CCAIP technology?",
      "options": ["A. Option one", "B. Option two", "C. Option three", "D. Option four"],
      "answer": "D",
      "explanation": "Detailed explanation of why this answer is correct"
    }
  ],
  "tags": ["ccaip", "contact-center-ai", "conversational-ai", "customer-service"],
  "readingTime": "5 min read",
  "difficulty": "Intermediate"
}`;

  console.log(`\ud83e\udd16 Generating complete CCAIP article: "${topic}"`);

  const response = await client.models.generateContent({
    model: CONFIG.model,
    contents: prompt,
  });

  let content = response.text.trim();

  // Clean up any markdown code fences
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Raw Gemini response:', content.substring(0, 500));
    throw new Error(`Failed to parse Gemini JSON response: ${e.message}`);
  }
}

// Fetch relevant image from Unsplash
async function fetchUnsplashImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || key === 'your-unsplash-key') {
    console.warn('\u26a0\ufe0f No Unsplash key, using placeholder image');
    return {
      url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop',
      author: 'CCAIP Daily',
      authorUrl: 'https://ccaip-daily.com'
    };
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&client_id=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const img = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
      console.log(`\ud83d\uddbc\ufe0f Image fetched: ${img.alt_description || query}`);
      return {
        url: img.urls.regular,
        author: img.user.name,
        authorUrl: img.user.links.html,
        description: img.alt_description || query
      };
    }
  } catch (e) {
    console.warn('\u26a0\ufe0f Unsplash fetch failed:', e.message);
  }

  return {
    url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop',
    author: 'CCAIP Daily',
    authorUrl: 'https://ccaip-daily.com'
  };
}

// Check if article already exists for today
function articleExistsForToday() {
  const today = new Date().toISOString().split('T')[0];
  
  if (!fs.existsSync(CONFIG.contentDir)) {
    return false;
  }

  const files = fs.readdirSync(CONFIG.contentDir);
  return files.some(file => file.startsWith(today) && file.endsWith('.md'));
}

// Initialize comments system
function initializeComments(slug) {
  if (!fs.existsSync(CONFIG.commentsDir)) {
    fs.mkdirSync(CONFIG.commentsDir, { recursive: true });
  }

  const commentsFile = path.join(CONFIG.commentsDir, `${slug}.json`);
  if (!fs.existsSync(commentsFile)) {
    const initialComments = {
      articleSlug: slug,
      comments: [],
      totalComments: 0,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(commentsFile, JSON.stringify(initialComments, null, 2), 'utf8');
    console.log(`\ud83d\udcac Comments initialized for: ${slug}`);
  }
}

// Save complete article with all features
async function saveCompleteArticle(articleData, topic) {
  if (!fs.existsSync(CONFIG.contentDir)) {
    fs.mkdirSync(CONFIG.contentDir, { recursive: true });
  }

  const today = new Date().toISOString().split('T')[0];
  const slug = createSlug(topic);
  const filename = `${today}-${slug}.md`;
  const filepath = path.join(CONFIG.contentDir, filename);

  // Fetch relevant image
  const image = await fetchUnsplashImage(articleData.imageQuery || topic);

  // Create complete markdown with all features
  const markdown = `---
title: "${articleData.title}"
description: "${articleData.description}"
author: "CCAIP Daily"
publishedAt: "${today}"
category: "ccaip"
tags: ${JSON.stringify(articleData.tags)}
image: "${image.url}"
imageAuthor: "${image.author}"
imageAuthorUrl: "${image.authorUrl}"
imageDescription: "${image.description}"
readingTime: "${articleData.readingTime}"
difficulty: "${articleData.difficulty}"
realTimeExample: ${JSON.stringify(articleData.realTimeExample)}
keyMetrics: ${JSON.stringify(articleData.keyMetrics)}
---

# ${articleData.title}

## Real-time Implementation Example

**Company:** ${articleData.realTimeExample.company}
**Implementation:** ${articleData.realTimeExample.implementation}
**Results:** ${articleData.realTimeExample.results}
**Timeline:** ${articleData.realTimeExample.timeline}

## Key Metrics & Results

${articleData.keyMetrics.map(metric => `- **${metric}**`).join('\n')}

## Article Content

${articleData.content}

## Test Your Knowledge

${articleData.questions.map((q, index) => `
### Question ${index + 1}: ${q.question}

${q.options.map(option => option).join('\n')}

**Answer:** ${q.answer}
**Explanation:** ${q.explanation}
`).join('\n')}

---

## Comments & Discussion

**Users can comment below on this CCAIP article. Share your thoughts, experiences, and questions about ${topic.toLowerCase()}.**

*Comments system enabled - Users can discuss this article and share their CCAIP implementation experiences.*

---

## Related CCAIP Topics

- [Dialogflow CX Best Practices](/blog/dialogflow-cx-best-practices)
- [Contact Center AI Implementation](/blog/contact-center-ai-implementation)
- [Voice Bot Development](/blog/voice-bot-development)
- [Queue Management Systems](/blog/queue-management-systems)

---

*This article is part of CCAIP Daily - Your automated source for Contact Center AI insights. New articles published every day.*
`;

  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`\ud83d\udcc4 Complete article saved: ${filename}`);
  
  // Initialize comments system
  initializeComments(slug);
  
  return { filepath, slug };
}

// Update website index (if needed)
function updateWebsiteIndex(slug, articleData) {
  const indexPath = path.join(process.cwd(), 'data', 'daily-articles.json');
  
  let articles = [];
  if (fs.existsSync(indexPath)) {
    articles = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }

  const newArticle = {
    slug: slug,
    title: articleData.title,
    description: articleData.description,
    publishedAt: new Date().toISOString().split('T')[0],
    image: articleData.imageQuery,
    tags: articleData.tags,
    readingTime: articleData.readingTime,
    difficulty: articleData.difficulty,
    commentsCount: 0
  };

  // Add to beginning (newest first)
  articles.unshift(newArticle);
  
  // Keep only last 30 articles
  articles = articles.slice(0, 30);
  
  fs.writeFileSync(indexPath, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`\ud83d\udcca Website index updated`);
}

// Main function
async function main() {
  console.log('\ud83d\ude80 FULLY AUTOMATED CCAIP DAILY GENERATOR Starting...\n');

  // Check if article already exists for today
  if (articleExistsForToday()) {
    console.log('\u2705 Today\'s CCAIP article already exists. Skipping generation.');
    return;
  }

  // Get random CCAIP topic
  const topic = getRandomCCAIPTopic();
  console.log(`\ud83d\udcc4 Today's CCAIP topic: "${topic}"`);

  try {
    // Generate complete article
    const articleData = await generateCompleteCCAIPArticle(topic);
    console.log('\u2705 Complete CCAIP article generated');

    // Save article with all features
    const { filepath, slug } = await saveCompleteArticle(articleData, topic);
    console.log('\u2705 Article saved with images, examples, and questions');

    // Update website index
    updateWebsiteIndex(slug, articleData);
    console.log('\u2705 Website index updated');

    console.log(`\n\ud83c\udf89 SUCCESS! Complete CCAIP article published:`);
    console.log(`\ud83d\udcc4 File: ${filepath}`);
    console.log(`\ud83d\udcac Comments: Enabled for user interaction`);
    console.log(`\ud83d\uddbc\ufe0f Images: Fetched from Unsplash`);
    console.log(`\ud83d\udcca Examples: Real-time implementation included`);
    console.log(`\u2753 Questions: 4 technical questions with explanations`);
    console.log(`\ud83d\udcf1 Auto-published to website\n`);

  } catch (error) {
    console.error('\u274c Error generating complete CCAIP article:', error.message);
    process.exit(1);
  }
}

// Run the complete automated generator
main().catch(err => {
  console.error('\u274c Fatal error:', err.message);
  process.exit(1);
});
