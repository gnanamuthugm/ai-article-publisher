# CCAIP Daily 📚

**One CCAIP concept a day — ace your certification!**

A Next.js website that auto-publishes a daily CCAIP article using Gemini AI + Unsplash images. Users can read, take a quiz, and comment on each article.

---

## 🏗️ Architecture

```
GitHub Actions (daily 9:30 AM IST)
  → scripts/generate-article.js
      → Gemini API (article + quiz content)
      → Unsplash API (hero image)
      → data/articles.json (updated)
  → git commit + push
  → Vercel auto-deploys
  → Website live!
```

---

## ⚙️ One-Time Setup

### 1. GitHub Secrets (required for automation)

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `UNSPLASH_ACCESS_KEY` | [unsplash.com/developers](https://unsplash.com/developers) → Your Apps |

### 2. Supabase Setup (for Comments)

1. Create free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run:

```sql
create table comments (
  id uuid default gen_random_uuid() primary key,
  article_id text not null,
  name text not null,
  comment text not null,
  created_at timestamp default now()
);

alter table comments enable row level security;
create policy "Anyone can read" on comments for select using (true);
create policy "Anyone can insert" on comments for insert with check (true);
```

4. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. Add to `.env.local` and also add as **Vercel Environment Variables**

### 3. Vercel Deployment

1. Connect your GitHub repo to [vercel.com](https://vercel.com)
2. Add these environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy!

---

## 🧪 Local Development

```bash
npm install
# Fill in .env.local with your keys
npm run dev
```

### Test article generation locally:
```bash
node scripts/generate-article.js
```

---

## 📁 Project Structure

```
ccaip-daily/
├── app/
│   ├── page.tsx              # Home page (article list)
│   ├── article/[slug]/       # Individual article page
│   └── layout.tsx
├── components/
│   ├── QuizSection.tsx       # Interactive quiz component
│   └── CommentSection.tsx    # Supabase-powered comments
├── content/articles/         # Markdown backups (auto-generated)
├── data/
│   └── articles.json         # THE source of truth for the website
├── scripts/
│   └── generate-article.js   # Daily article generator
└── .github/workflows/
    └── daily-article.yml     # GitHub Actions cron job
```

---

## 📅 Topic Schedule

60 CCAIP topics rotate daily, starting from Jan 1 2026. Topics cover:
- IVR, Conversational AI, NLP, Speech Analytics
- WFM, QM, CRM Integration
- KPIs: AHT, FCR, CSAT, NPS, CES
- Google CCAI Platform, Dialogflow CX
- AI features, Compliance, Future trends
- ... and much more!
