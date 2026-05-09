/**
 * Instagram Auto-Post Script
 *
 * Flow:
 *  1. LinkedIn + Website publish ஆன அதே நாளில் மட்டும் run ஆகும்
 *  2. Gemini மூலம் IT/Tech content generate பண்ணும்
 *  3. Canvas மூலம் 2 carousel images create பண்ணும் (HTML → PNG via Puppeteer)
 *  4. Instagram Graph API மூலம் carousel post போடும்
 *  5. Quiz (green/red feedback) caption-ல் embed ஆகும் — website-ல் interactive
 *
 * Required ENV:
 *   INSTAGRAM_ACCESS_TOKEN  — Long-lived token from Facebook Developer Console
 *   INSTAGRAM_USER_ID       — Instagram Business/Creator Account ID
 *   GEMINI_API_KEY          — Already in .env.local
 *   UNSPLASH_ACCESS_KEY     — Already in .env.local
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');
require('dotenv').config({ path: '.env.local' });

const { generateInstagramContent, fetchUnsplashImage, getDailyTopic, getISTDate } = require('./generate-instagram-content');

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const LOG_PATH = path.join(process.cwd(), 'data', 'instagram-posts.json');
const LINKEDIN_LOG_PATH = path.join(process.cwd(), 'data', 'linkedin-posts.json');
const IMAGES_DIR = path.join(process.cwd(), 'data', 'instagram-images');

// ── Guard: Instagram post only on LinkedIn/website publish days ──────────────
function linkedinPostedToday() {
  const today = getISTDate();
  try {
    const log = JSON.parse(fs.readFileSync(LINKEDIN_LOG_PATH, 'utf8'));
    return log.some(p => p.date === today);
  } catch {
    return false;
  }
}

// ── Load / Save instagram log ─────────────────────────────────────────────────
function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); } catch { return []; }
}

function saveLog(log) {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

// ── Supabase helper ───────────────────────────────────────────────────────────
async function supabaseInsert(table, record) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(record),
    });
    if (res.ok) { console.log(`✅ Supabase [${table}] saved`); return true; }
    console.warn(`⚠️  Supabase [${table}] failed: ${res.status}`);
    return false;
  } catch (e) {
    console.warn(`⚠️  Supabase error: ${e.message}`);
    return false;
  }
}

// ── Image generation using node-canvas ───────────────────────────────────────
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Slide 1: Title card
function generateSlide1(content) {
  const SIZE = 1080;
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  const bg = content.slide1.bgColor || '#0d1117';
  const { r, g, b } = hexToRgb(bg);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 40, 255)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Decorative grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < SIZE; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(SIZE, i); ctx.stroke();
  }

  // Top accent bar
  const accent = ctx.createLinearGradient(0, 0, SIZE, 0);
  accent.addColorStop(0, '#00d4ff');
  accent.addColorStop(0.5, '#7b2fff');
  accent.addColorStop(1, '#ff6b6b');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, SIZE, 6);
  ctx.fillRect(0, SIZE - 6, SIZE, 6);

  // Emoji
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.fillText(content.slide1.emoji || '💻', SIZE / 2, 280);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  const titleLines = content.slide1.title.split(' ');
  // Break into 2 lines if long
  if (titleLines.length > 4) {
    const mid = Math.ceil(titleLines.length / 2);
    ctx.fillText(titleLines.slice(0, mid).join(' '), SIZE / 2, 420);
    ctx.fillText(titleLines.slice(mid).join(' '), SIZE / 2, 490);
  } else {
    ctx.fillText(content.slide1.title, SIZE / 2, 450);
  }

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, content.slide1.subtitle, SIZE / 2, 580, 900, 46);

  // Swipe hint
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '26px sans-serif';
  ctx.fillText('Swipe to learn →', SIZE / 2, 920);

  // Branding
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '22px sans-serif';
  ctx.fillText('@techlearndaily', SIZE / 2, 970);

  return canvas.toBuffer('image/png');
}

// Slide 2: Content card with key points
function generateSlide2(content) {
  const SIZE = 1080;
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  const bg = content.slide2.bgColor || '#0f3460';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle gradient overlay
  const grad = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 100, SIZE / 2, SIZE / 2, 700);
  grad.addColorStop(0, 'rgba(255,255,255,0.03)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Top accent
  const accent = ctx.createLinearGradient(0, 0, SIZE, 0);
  accent.addColorStop(0, '#00d4ff');
  accent.addColorStop(1, '#7b2fff');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, SIZE, 6);

  // Heading
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(content.slide2.heading, 60, 100);

  // Divider
  ctx.strokeStyle = 'rgba(0,212,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 120); ctx.lineTo(SIZE - 60, 120); ctx.stroke();

  // Key points
  const points = content.slide2.points || [];
  const dotColors = ['#00d4ff', '#7b2fff', '#ff6b6b', '#ffd700'];
  let yPos = 180;

  points.forEach((point, i) => {
    // Dot
    ctx.fillStyle = dotColors[i % dotColors.length];
    ctx.beginPath();
    ctx.arc(80, yPos - 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, point, 110, yPos, 900, 42);
    yPos += 90;
  });

  // Code snippet (if available)
  if (content.slide2.codeSnippet && content.slide2.codeSnippet.trim()) {
    const codeY = Math.max(yPos + 20, 620);
    // Code block background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(50, codeY, SIZE - 100, 260, 12);
    ctx.fill();

    // Language label
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(content.slide2.codeLanguage || 'code', 70, codeY + 32);

    // Code lines
    ctx.fillStyle = '#a8ff78';
    ctx.font = '24px monospace';
    const codeLines = content.slide2.codeSnippet.split('\n').slice(0, 6);
    codeLines.forEach((line, i) => {
      ctx.fillText(line, 70, codeY + 70 + i * 34);
    });
  }

  // Bottom branding
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('@techlearndaily', SIZE / 2, 1048);

  return canvas.toBuffer('image/png');
}

// ── Save images locally ───────────────────────────────────────────────────────
function saveImages(slide1Buffer, slide2Buffer, date) {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const s1 = path.join(IMAGES_DIR, `${date}-slide1.png`);
  const s2 = path.join(IMAGES_DIR, `${date}-slide2.png`);
  fs.writeFileSync(s1, slide1Buffer);
  fs.writeFileSync(s2, slide2Buffer);
  console.log(`🖼️  Slides saved: ${date}-slide1.png, ${date}-slide2.png`);
  return { s1, s2 };
}

// ── Upload image to Instagram (via URL — must be publicly accessible) ─────────
// Instagram Graph API requires images to be hosted at a public URL.
// We upload to imgbb (free image hosting) to get a public URL.
async function uploadImageToImgBB(imageBuffer) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  IMGBB_API_KEY missing — cannot upload images to public URL');
    return null;
  }

  try {
    const base64 = imageBuffer.toString('base64');
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', base64);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      console.log(`✅ Image uploaded to imgbb: ${data.data.url}`);
      return data.data.url;
    }
    console.warn('⚠️  imgbb upload failed:', JSON.stringify(data));
    return null;
  } catch (e) {
    console.warn('⚠️  imgbb error:', e.message);
    return null;
  }
}

// ── Instagram Graph API: Create container ─────────────────────────────────────
async function createInstagramContainer(imageUrl, isCarousel = false, caption = '') {
  const params = new URLSearchParams({
    access_token: INSTAGRAM_ACCESS_TOKEN,
  });

  if (isCarousel) {
    params.append('media_type', 'CAROUSEL');
    params.append('caption', caption);
  } else {
    params.append('image_url', imageUrl);
    params.append('is_carousel_item', 'true');
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media?${params}`,
    { method: 'POST' }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Instagram container error: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

async function createCarouselContainer(childrenIds, caption) {
  const params = new URLSearchParams({
    access_token: INSTAGRAM_ACCESS_TOKEN,
    media_type: 'CAROUSEL',
    caption: caption,
    children: childrenIds.join(','),
  });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media?${params}`,
    { method: 'POST' }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Instagram carousel error: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

async function publishInstagramContainer(containerId) {
  const params = new URLSearchParams({
    access_token: INSTAGRAM_ACCESS_TOKEN,
    creation_id: containerId,
  });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${INSTAGRAM_USER_ID}/media_publish?${params}`,
    { method: 'POST' }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Instagram publish error: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

// ── Wait for container to be ready ───────────────────────────────────────────
async function waitForContainer(containerId, maxWait = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const data = await res.json();
    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') throw new Error('Container processing failed');
    console.log(`⏳ Container status: ${data.status_code}, waiting...`);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Container processing timeout');
}

// ── Build quiz caption ────────────────────────────────────────────────────────
function buildQuizCaption(content) {
  const quiz = content.quiz;
  const options = quiz.options.map(o => `${o.label}. ${o.text}`).join('\n');
  const correctLabel = quiz.options.find(o => o.correct)?.label || 'C';

  return `${content.caption}

━━━━━━━━━━━━━━━━━━━━━━
🧠 QUIZ TIME!
━━━━━━━━━━━━━━━━━━━━━━
${quiz.question}

${options}

💬 Comment your answer below!
✅ Answer: ${correctLabel} | ${quiz.explanation}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📸 Instagram Auto-Post\n');

  const today = getISTDate();

  // ── CRITICAL GUARD: Only post on LinkedIn/website publish days ──
  if (!linkedinPostedToday()) {
    console.log(`📅 LinkedIn has NOT posted today (${today}). Skipping Instagram.`);
    console.log('⏭️  Instagram posts only on LinkedIn + Website publish days.');
    return;
  }

  // ── Check if already posted today ──
  const log = loadLog();
  if (log.find(p => p.date === today)) {
    console.log('✅ Already posted to Instagram today. Skipping.');
    return;
  }

  // ── Check credentials ──
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    console.log('\n⚠️  Instagram credentials missing!');
    console.log('   Add to .env.local and GitHub Secrets:');
    console.log('   INSTAGRAM_ACCESS_TOKEN=<your_token>');
    console.log('   INSTAGRAM_USER_ID=<your_ig_user_id>');
    console.log('\n📋 Setup Guide:');
    console.log('   1. https://developers.facebook.com → Create App → Business');
    console.log('   2. Add "Instagram Graph API" product');
    console.log('   3. Connect your Instagram Business/Creator account');
    console.log('   4. Generate long-lived access token (valid 60 days)');
    console.log('   5. Get User ID: GET https://graph.facebook.com/v21.0/me?access_token=YOUR_TOKEN');
    return;
  }

  // Check imgbb key
  if (!process.env.IMGBB_API_KEY) {
    console.log('\n⚠️  IMGBB_API_KEY missing!');
    console.log('   Instagram requires publicly hosted images.');
    console.log('   1. https://imgbb.com → Sign up → API → Get free API key');
    console.log('   2. Add IMGBB_API_KEY to .env.local and GitHub Secrets');
    return;
  }

  // ── Generate content ──
  const topic = getDailyTopic();
  console.log(`📌 Topic: "${topic}"`);

  let content;
  try {
    content = await generateInstagramContent(topic);
  } catch (err) {
    console.error(`❌ Content generation failed: ${err.message}`);
    process.exit(1);
  }

  // ── Generate images ──
  console.log('\n🎨 Generating carousel images...');
  const slide1Buffer = generateSlide1(content);
  const slide2Buffer = generateSlide2(content);
  saveImages(slide1Buffer, slide2Buffer, today);

  // ── Upload images to imgbb ──
  console.log('\n📤 Uploading images...');
  const [url1, url2] = await Promise.all([
    uploadImageToImgBB(slide1Buffer),
    uploadImageToImgBB(slide2Buffer),
  ]);

  if (!url1 || !url2) {
    console.error('❌ Image upload failed — cannot post to Instagram');
    process.exit(1);
  }

  // ── Build caption with quiz ──
  const caption = buildQuizCaption(content);
  console.log('\n📝 Caption preview:');
  console.log(caption.substring(0, 300) + '...\n');

  // ── Post to Instagram ──
  console.log('📸 Creating Instagram carousel...');
  try {
    // Create individual slide containers
    const container1Id = await createInstagramContainer(url1);
    console.log(`✅ Slide 1 container: ${container1Id}`);
    await new Promise(r => setTimeout(r, 2000));

    const container2Id = await createInstagramContainer(url2);
    console.log(`✅ Slide 2 container: ${container2Id}`);
    await new Promise(r => setTimeout(r, 2000));

    // Create carousel container
    const carouselId = await createCarouselContainer([container1Id, container2Id], caption);
    console.log(`✅ Carousel container: ${carouselId}`);

    // Wait for processing
    await waitForContainer(carouselId);

    // Publish
    const postId = await publishInstagramContainer(carouselId);
    console.log(`\n🎉 Instagram carousel posted! ID: ${postId}`);

    // ── Log it ──
    const logEntry = {
      date: today,
      topic,
      postId,
      caption: caption.substring(0, 200),
      imageUrls: [url1, url2],
      quiz: content.quiz,
      postedAt: new Date().toISOString(),
    };
    log.unshift(logEntry);
    saveLog(log);

    // ── Supabase ──
    await supabaseInsert('instagram_posts', {
      date: today,
      topic,
      post_id: postId,
      caption: caption.substring(0, 500),
      image_url_1: url1,
      image_url_2: url2,
      quiz_question: content.quiz.question,
      quiz_correct: content.quiz.options.find(o => o.correct)?.label,
      posted_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error(`❌ Instagram post failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`❌ Instagram script error: ${err.message}`);
  console.log('⏭️  Workflow continuing safely.');
  process.exit(0);
});
