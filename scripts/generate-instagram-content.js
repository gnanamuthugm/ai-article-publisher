const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const MODEL = 'gemini-2.5-flash-lite-preview-06-17';

// IT & Technology topics for Instagram
const IT_TOPICS = [
  // Programming Languages
  "Python List Comprehension vs For Loop",
  "JavaScript Async/Await vs Promises",
  "Java vs Python for Backend Development",
  "TypeScript vs JavaScript - When to Use",
  "Rust Memory Safety Without Garbage Collector",
  "Go Goroutines and Concurrency Model",
  "C++ Pointers and Memory Management",
  "Kotlin vs Java for Android Development",

  // DSA
  "Big O Notation - Time Complexity Explained",
  "Binary Search vs Linear Search",
  "Stack vs Queue Data Structures",
  "Hash Map Collision Handling Techniques",
  "Binary Tree vs Binary Search Tree",
  "Dijkstra's Algorithm for Shortest Path",
  "Dynamic Programming Memoization vs Tabulation",
  "Merge Sort vs Quick Sort Comparison",
  "Graph BFS vs DFS Traversal",
  "Linked List vs Array - When to Use Which",
  "AVL Tree vs Red-Black Tree",
  "Heap Data Structure and Priority Queue",

  // Database
  "SQL vs NoSQL - Choose the Right Database",
  "PostgreSQL vs MySQL vs SQLite",
  "Database Indexing - How It Speeds Up Queries",
  "ACID Properties in Database Transactions",
  "Redis Caching Strategies",
  "MongoDB Document vs Relational Models",
  "Database Normalization - 1NF 2NF 3NF",
  "Sharding vs Replication in Databases",
  "ORM vs Raw SQL - Pros and Cons",
  "Connection Pooling in Databases",

  // Server & Backend
  "REST API vs GraphQL vs gRPC",
  "Microservices vs Monolithic Architecture",
  "Load Balancing Algorithms Explained",
  "Nginx vs Apache Web Server",
  "Node.js Event Loop Explained",
  "Docker Containers vs Virtual Machines",
  "Kubernetes Pod vs Deployment vs Service",
  "JWT vs Session Authentication",
  "OAuth2 and OpenID Connect Explained",
  "Rate Limiting and Throttling APIs",
  "WebSockets vs HTTP Long Polling",
  "Message Queues: Kafka vs RabbitMQ",
  "gRPC vs REST for Microservices",

  // Internet & Networking
  "TCP vs UDP - Which Protocol When",
  "HTTP vs HTTPS - SSL/TLS Explained",
  "DNS How Domain Names Resolve to IP",
  "CDN Content Delivery Network Benefits",
  "OSI Model 7 Layers Explained Simply",
  "IPv4 vs IPv6 - The Big Difference",
  "HTTP/1.1 vs HTTP/2 vs HTTP/3",
  "CORS - Cross-Origin Resource Sharing",
  "SSL Certificate Types - DV OV EV",
  "VPN How It Works and When to Use",

  // Deployment & DevOps
  "CI/CD Pipeline - From Code to Production",
  "Blue-Green Deployment vs Canary Release",
  "Infrastructure as Code - Terraform Basics",
  "GitHub Actions vs Jenkins CI/CD",
  "AWS EC2 vs Lambda vs ECS",
  "Serverless Architecture Pros and Cons",
  "Kubernetes vs Docker Swarm",
  "Monitoring with Prometheus and Grafana",
  "Logging Best Practices in Production",
  "Zero Downtime Deployment Strategies",

  // System Design
  "CAP Theorem in Distributed Systems",
  "Event-Driven Architecture Explained",
  "CQRS Pattern Command Query Separation",
  "Circuit Breaker Pattern for Resilience",
  "API Gateway Pattern in Microservices",
  "Saga Pattern for Distributed Transactions",
  "Cache Invalidation Strategies",
  "Consistent Hashing in Distributed Systems",
];

function getISTDate() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function getDailyTopic() {
  const today = getISTDate();
  // Deterministic topic selection based on date so same topic across runs on same day
  const seed = today.replace(/-/g, '');
  const index = parseInt(seed) % IT_TOPICS.length;
  return IT_TOPICS[index];
}

async function generateInstagramContent(topic) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  const client = new GoogleGenAI({ apiKey });

  const prompt = `You are an IT & Technology educator creating Instagram educational content for developers and tech enthusiasts.

Topic: "${topic}"

Generate Instagram carousel content with EXACTLY this JSON structure (no markdown fences):
{
  "topic": "${topic}",
  "slide1": {
    "title": "Catchy title (max 8 words)",
    "subtitle": "One-line hook that makes them swipe (max 12 words)",
    "emoji": "2-3 relevant emojis",
    "bgColor": "#HEX color (dark, tech-feel like #1a1a2e or #0f3460 or #16213e or #0d1117)"
  },
  "slide2": {
    "heading": "Key Concept (max 5 words)",
    "points": [
      "Point 1 - clear, concise (max 12 words)",
      "Point 2 - clear, concise (max 12 words)",
      "Point 3 - clear, concise (max 12 words)",
      "Point 4 - clear, concise (max 12 words)"
    ],
    "codeSnippet": "Short 3-5 line code example if applicable, else empty string",
    "codeLanguage": "language name or empty",
    "bgColor": "#HEX (slightly different dark shade from slide1)"
  },
  "caption": "Instagram caption (150-200 chars). Hook + value + call to action. End with newline then 8-10 relevant hashtags like #Python #DSA #Programming #WebDev #Backend #TechTips #Developer #CodingLife #100DaysOfCode #SoftwareEngineering",
  "quiz": {
    "question": "Technical question about ${topic} (clear, one-sentence)",
    "options": [
      {"label": "A", "text": "Option A (max 8 words)", "correct": false},
      {"label": "B", "text": "Option B (max 8 words)", "correct": false},
      {"label": "C", "text": "Option C (max 8 words)", "correct": true},
      {"label": "D", "text": "Option D (max 8 words)", "correct": false}
    ],
    "explanation": "Why the correct answer is right (2-3 sentences, practical explanation)"
  },
  "imageQuery": "3-4 word Unsplash search for tech background (e.g. 'dark coding screen', 'server room blue')"
}

RULES:
- Make content genuinely educational and useful for developers
- Quiz must have EXACTLY ONE correct option
- Correct option can be A, B, C, or D (vary it, not always C)
- Code snippet should be real, working code
- Colors must be dark/tech-themed
- Hashtags must be on separate lines after caption text

Return ONLY valid JSON, no explanation, no markdown.`;

  console.log(`🤖 Generating Instagram content for: "${topic}"`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.models.generateContent({ model: MODEL, contents: prompt });
      let text = response.text.trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(text);
      console.log('✅ Instagram content generated');
      return parsed;
    } catch (err) {
      const msg = err.message || '';
      if (attempt === 1 && (msg.includes('429') || msg.includes('503'))) {
        console.log('⏳ Rate limit hit, waiting 65s...');
        await new Promise(r => setTimeout(r, 65000));
        continue;
      }
      throw err;
    }
  }
}

async function fetchUnsplashImage(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || key === 'your-unsplash-key') {
    return 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1080&auto=format&fit=crop';
  }
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=squarish&client_id=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results?.length > 0) {
      const img = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
      return img.urls.regular;
    }
  } catch (e) {
    console.warn('⚠️ Unsplash fetch failed:', e.message);
  }
  return 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1080&auto=format&fit=crop';
}

module.exports = { generateInstagramContent, fetchUnsplashImage, getDailyTopic, getISTDate };

// Run standalone
if (require.main === module) {
  (async () => {
    const topic = getDailyTopic();
    const content = await generateInstagramContent(topic);
    console.log('\n📋 Generated Content:');
    console.log(JSON.stringify(content, null, 2));
  })().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}
