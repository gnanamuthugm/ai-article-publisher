# 🚀 CCAIP Daily — Complete Setup & Deployment Guide

---

## ✅ What's Automated (100% hands-free after setup)

| Time         | What happens                                              |
|--------------|-----------------------------------------------------------|
| 11:30 AM IST | GitHub Actions generates blog article (Gemini + Unsplash) |
| 11:31 AM IST | Git push → Vercel auto-deploys new article to website     |
| 11:32 AM IST | LinkedIn gets a short 3-line teaser post + image + link   |

---

## 📋 One-Time Setup Checklist

### 1. Supabase (Comments database)

Run this SQL in Supabase SQL Editor (supabase.com → SQL Editor):

```sql
create table if not exists comments (
  id          uuid default gen_random_uuid() primary key,
  article_id  text        not null,
  name        text        not null,
  comment     text        not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz
);
create index if not exists idx_comments_article_id on comments(article_id);
alter table comments enable row level security;
create policy "Public read"   on comments for select using (true);
create policy "Public insert" on comments for insert with check (true);
create policy "Public update" on comments for update using (true);
```

---

### 2. LinkedIn API Setup (for auto-posting)

**Step A: Create LinkedIn App**
1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app" → fill in details → select your LinkedIn Page
3. Under "Products" → request access to **"Share on LinkedIn"** and **"Sign In with LinkedIn"**

**Step B: Get Access Token**
1. Go to your app → "Auth" tab
2. Note your Client ID and Client Secret
3. Use this URL to get OAuth token (replace YOUR_CLIENT_ID):
   ```
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://localhost&scope=openid%20profile%20w_member_social
   ```
4. Authorize → copy the `code` from the redirect URL
5. Exchange code for token:
   ```bash
   curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
     -d "grant_type=authorization_code" \
     -d "code=YOUR_CODE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=https://localhost"
   ```
6. Save the `access_token` (valid for 60 days — refresh monthly)

**Step C: Get your Person URN**
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.linkedin.com/v2/userinfo
```
Look for `"sub"` field → your URN is `urn:li:person:SUB_VALUE`

---

### 3. GitHub Secrets Setup

Go to: GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

Add ALL of these:

| Secret Name              | Value                                      |
|--------------------------|--------------------------------------------|
| `GEMINI_API_KEY`         | AIzaSyAhBg_uzWFxYsudv_QyVCms5I9AtVi9QwY  |
| `UNSPLASH_ACCESS_KEY`    | _yfg8F-u0paMnZmeWEIl5NGIMa7yaYhJE2e--oTzSBo |
| `LINKEDIN_ACCESS_TOKEN`  | (from Step B above)                        |
| `LINKEDIN_PERSON_URN`    | urn:li:person:XXXXXXX (from Step C)        |
| `BLOG_BASE_URL`          | https://your-project.vercel.app            |

---

### 4. Vercel Deployment

**Step A: Connect GitHub to Vercel**
1. Go to https://vercel.com → "Add New Project"
2. Import your GitHub repo: `gnanamuthugm/ai-article-publisher`
3. Framework: **Next.js** (auto-detected)
4. Click Deploy

**Step B: Add Environment Variables in Vercel**
Go to: Vercel → Project → Settings → Environment Variables

Add these (for API routes to work in production):

| Variable                      | Value                                         |
|-------------------------------|-----------------------------------------------|
| `GEMINI_API_KEY`              | AIzaSyAhBg_uzWFxYsudv_QyVCms5I9AtVi9QwY     |
| `NEXT_PUBLIC_SUPABASE_URL`    | https://ejfsbwnfaesgcbmpzmur.supabase.co      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sb_publishable_6ExzU6_aB8NyiQkVsDvbYw_tfQ7fpzc |

**Step C: Redeploy after adding env vars**
Vercel → Deployments → "Redeploy"

**Step D: Update BLOG_BASE_URL**
After Vercel gives you a URL (e.g. https://ccaip-daily.vercel.app):
- Update GitHub Secret `BLOG_BASE_URL` with this URL
- Update `.env.local`: `BLOG_BASE_URL=https://ccaip-daily.vercel.app`

---

### 5. Push Code to GitHub

```bash
cd "C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher"

# Check what's changed
git status

# Stage everything
git add .

# Commit
git commit -m "feat: language switcher, comment translation, LinkedIn auto-post, monthly category rotation"

# Push (triggers Vercel auto-deploy)
git push origin main
```

---

### 6. Test Locally First

```bash
# Install dependencies
npm install

# Test article generation
node scripts/generate-daily-blog.js

# Test LinkedIn post (will preview without posting if no token)
node scripts/post-to-linkedin.js

# Start dev server
npm run dev
# Open: http://localhost:3000/en
```

---

## 🗂️ Category Schedule

| Month     | Category                      |
|-----------|-------------------------------|
| April 2026    | 🤖 Dialogflow CX           |
| May 2026      | 📖 Conversational Agents Playbook |
| June 2026     | ⭐ Customer Effort Score    |
| July 2026     | 🎯 CCAIP                   |
| August 2026   | 🤖 Dialogflow CX (repeat)  |
| ...           | Cycles every 4 months      |

---

## 🌐 Features Summary

| Feature                    | How it works                                              |
|----------------------------|-----------------------------------------------------------|
| Daily blog article         | GitHub Actions → Gemini AI → articles.json → Vercel      |
| Language switcher          | Top-right button → Gemini translates content on demand    |
| Comment in any language    | Users type in any language — stored in Supabase           |
| Translate comment          | "🌐 Translate to English" button per comment              |
| Edit comment               | "✏️ Edit" button — updates Supabase, shows (edited) tag  |
| LinkedIn auto-post         | Short 3-line teaser + image + blog URL — different content|
| Monthly category rotation  | Automatic — no manual intervention needed                 |
| Image per article          | Unsplash API — relevant photo fetched automatically       |
| 2-question locked quiz     | After submit, answers locked — no retry                   |

---

## ⚠️ Important Notes

1. **LinkedIn token expires in 60 days** — refresh monthly at LinkedIn Developer Portal
2. **Blog content ≠ LinkedIn content** — Gemini generates separate teaser for LinkedIn
3. **Free Vercel** is enough — no paid plan needed for this project
4. **Supabase free tier** supports 500MB storage and 50k monthly active users — more than enough
5. **Gemini 2.5 Flash** — very fast and cheap, well within free tier limits

---

## 🔍 Viewing Comments in Supabase

Supabase Dashboard → Table Editor → `comments` table
- Filter by `article_id` to see specific article comments
- Sort by `created_at` to see latest first
- `updated_at` is non-null when a comment was edited
