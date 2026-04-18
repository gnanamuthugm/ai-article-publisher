"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import QuizSection from "@/components/QuizSection";
import CommentsSection from "@/components/CommentsSection";
import { createClient } from "@supabase/supabase-js";

interface Article {
  slug: string;
  title: string;
  date: string;
  category: string;
  categoryName: string;
  categoryEmoji: string;
  categoryColor: string;
  summary: string;
  content: string;
  realWorldExample: string;
  keyPoints: string[];
  image: string;
  tags: string[];
  quiz: any[];
}

function getCategoryStyle(color: string) {
  const styles: Record<string, string> = {
    blue:   "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    green:  "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return styles[color] || "bg-gray-100 text-gray-700";
}

// ── PDF Download — proper format with image + quiz ──────────
async function downloadArticlePDF(article: Article) {
  // Build clean HTML for PDF
  const stripHtml = (html: string) =>
    html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const quizHtml = article.quiz?.length
    ? article.quiz.map((q: any, i: number) => `
        <div style="margin-bottom:20px;padding:14px 16px;background:#f8f9ff;border-left:4px solid #3b82f6;border-radius:6px;">
          <p style="font-weight:700;color:#1e3a8a;margin:0 0 10px 0;font-size:14px;">Q${i + 1}: ${q.question}</p>
          ${q.options.map((opt: string) => `
            <p style="margin:4px 0;font-size:13px;color:${opt.startsWith(q.answer) ? '#166534' : '#374151'};
              font-weight:${opt.startsWith(q.answer) ? '700' : '400'};">
              ${opt.startsWith(q.answer) ? '✓ ' : ''}${opt}
            </p>`).join('')}
        </div>`).join('')
    : '<p style="color:#6b7280;font-size:13px;">No quiz questions available.</p>';

  const keyPointsHtml = article.keyPoints?.length
    ? article.keyPoints.map(p => `
        <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;">
          <span style="color:#d97706;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#92400e;">${p}</span>
        </div>`).join('')
    : '';

  const contentText = article.content
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, t) => `<h2 style="font-size:18px;font-weight:700;color:#1e3a8a;margin:28px 0 10px;border-bottom:2px solid #dbeafe;padding-bottom:6px;">${t}</h2>`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, t) => `<h3 style="font-size:15px;font-weight:700;color:#1d4ed8;margin:22px 0 8px;">${t}</h3>`)
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, (_, t) => `<h4 style="font-size:14px;font-weight:600;color:#2563eb;margin:18px 0 6px;">${t}</h4>`)
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_, t) => `<p style="margin:0 0 14px;line-height:1.8;font-size:13px;color:#374151;">${t}</p>`)
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, t) => `<ul style="margin:0 0 14px;padding-left:20px;">${t}</ul>`)
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, t) => `<ol style="margin:0 0 14px;padding-left:20px;">${t}</ol>`)
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_, t) => `<li style="margin-bottom:6px;font-size:13px;color:#374151;">${t}</li>`)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '<strong style="font-weight:700;color:#111827;">$1</strong>')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:12px;font-family:monospace;">$1</code>')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, t) => `<blockquote style="border-left:4px solid #93c5fd;padding:10px 16px;margin:16px 0;background:#eff6ff;border-radius:4px;">${t}</blockquote>`)
    .replace(/<[^>]+>/g, '');

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', Arial, sans-serif;
    margin: 0;
    padding: 0;
    color: #111827;
    background: white;
  }
  .page {
    width: 794px;
    padding: 48px 56px;
    background: white;
  }
  .header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .category-badge {
    background: #dbeafe;
    color: #1e40af;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
  }
  .date {
    font-size: 11px;
    color: #9ca3af;
  }
  h1 {
    font-size: 26px;
    font-weight: 700;
    color: #111827;
    line-height: 1.3;
    margin: 16px 0 8px;
  }
  .summary-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 14px 18px;
    border-radius: 0 8px 8px 0;
    margin: 20px 0 24px;
  }
  .summary-box .label {
    font-size: 12px;
    font-weight: 700;
    color: #1d4ed8;
    margin-bottom: 4px;
  }
  .summary-box p {
    font-size: 13px;
    color: #1e40af;
    margin: 0;
    line-height: 1.6;
  }
  .feature-image {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 28px;
  }
  .content { margin-bottom: 28px; }
  .section-box {
    border-radius: 8px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .section-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 14px;
  }
  .rwe-box { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .rwe-box .section-title { color: #166534; }
  .rwe-box p { font-size: 13px; color: #14532d; margin: 0; line-height: 1.7; }
  .key-box { background: #fffbeb; border: 1px solid #fde68a; }
  .key-box .section-title { color: #92400e; }
  .quiz-box { background: #f9fafb; border: 1px solid #e5e7eb; }
  .quiz-box .section-title { color: #1e3a8a; }
  .divider {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 28px 0;
  }
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 2px solid #dbeafe;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .footer .author { font-size: 12px; font-weight: 600; color: #1d4ed8; }
  .footer .links { font-size: 11px; color: #6b7280; }
  .footer a { color: #2563eb; text-decoration: none; margin-left: 8px; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 0; }
  .tag {
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 100px;
    font-weight: 500;
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header-bar">
    <span class="category-badge">${article.categoryEmoji} ${article.categoryName}</span>
    <span class="date">${article.date}</span>
  </div>

  <h1>${article.title}</h1>

  <!-- Tags -->
  <div class="tags">
    ${article.tags?.map(t => `<span class="tag">#${t}</span>`).join('') || ''}
  </div>

  <!-- Summary -->
  <div class="summary-box">
    <div class="label">📌 What you'll learn today</div>
    <p>${article.summary}</p>
  </div>

  <!-- Feature Image -->
  <img class="feature-image" src="${article.image}" alt="${article.title}" crossorigin="anonymous" />

  <!-- Article Content -->
  <div class="content">
    ${contentText}
  </div>

  <hr class="divider" />

  <!-- Real-World Example -->
  ${article.realWorldExample ? `
  <div class="section-box rwe-box">
    <div class="section-title">🌍 Real-World Example</div>
    <p>${article.realWorldExample}</p>
  </div>` : ''}

  <!-- Key Takeaways -->
  ${article.keyPoints?.length ? `
  <div class="section-box key-box">
    <div class="section-title">⭐ Key Takeaways</div>
    ${keyPointsHtml}
  </div>` : ''}

  <!-- Quiz Questions -->
  ${article.quiz?.length ? `
  <div class="section-box quiz-box">
    <div class="section-title">❓ Quiz Questions</div>
    ${quizHtml}
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="author">Gnanamuthu G — AI & Contact Center Expert</div>
      <div class="links" style="margin-top:4px;">
        Generated from Learn Daily
        <a href="https://ai-article-publisher.vercel.app">Website</a>
        <a href="https://www.linkedin.com/in/gnanamuthugm">LinkedIn</a>
        <a href="https://gnanamuthugm.github.io/portfolio">Portfolio</a>
        <a href="https://topmate.io/gnanamuthugm">Interview Questions</a>
      </div>
    </div>
    <div class="date" style="font-size:11px;">ai-article-publisher.vercel.app</div>
  </div>
</div>
</body>
</html>`;

  // Open in new tab and trigger print as PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for image to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };
}

export default function ArticleClient({ article, lang }: { article: Article; lang: string }) {
  const [displayContent, setDisplayContent] = useState(article.content);
  const [currentLang, setCurrentLang] = useState("en");
  const [visitCount, setVisitCount] = useState<number | null>(null);

  function handleTranslated(lang: string, translated: string) {
    setCurrentLang(lang);
    setDisplayContent(translated);
  }

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("https://")) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    async function trackVisit() {
      try {
        await supabase.rpc('increment_article_views', { article_slug: article.slug });
        const { data } = await supabase.from('article_views').select('view_count').eq('article_id', article.slug).single();
        if (data) setVisitCount(data.view_count);
      } catch (e) {}
    }
    trackVisit();
  }, [article.slug]);

  const categoryStyle = getCategoryStyle(article.categoryColor || "blue");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/${lang}`} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            ← Learn Daily
          </Link>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryStyle}`}>
              {article.categoryEmoji} {article.categoryName}
            </span>
            <LanguageSwitcher
              articleContent={article.content}
              onTranslated={handleTranslated}
              currentLang={currentLang}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {article.image && (
          <img src={article.image} alt={article.title} className="w-full h-64 object-cover rounded-2xl mb-6 shadow-sm" />
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm text-gray-400">{article.date}</span>
          {visitCount !== null && (
            <span className="text-xs text-gray-400 flex items-center gap-1">👁️ {visitCount.toLocaleString()} views</span>
          )}
          {article.tags?.map((tag: string) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">#{tag}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{article.title}</h1>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-8">
          <p className="font-semibold text-blue-800 mb-1">📌 What you&apos;ll learn today</p>
          <p className="text-blue-700 text-sm leading-relaxed">{article.summary}</p>
        </div>

        <div
          className="mb-8 text-gray-700
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:leading-relaxed [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
            [&_li]:mb-1.5 [&_strong]:text-gray-900"
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />

        {article.keyPoints?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-2xl mb-8">
            <h3 className="font-bold text-yellow-800 mb-3">⭐ Key Takeaways</h3>
            <ul className="space-y-2">
              {article.keyPoints.map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-yellow-700">
                  <span className="text-yellow-500 font-bold mt-0.5">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* About Author BEFORE Real-World */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">About the Author</p>
          <div className="flex items-start gap-4">
            <img src="/images/profile.png" alt="Gnanamuthu G" className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-base">Gnanamuthu G</p>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                AI &amp; Contact Center specialist with expertise in Google CCAIP, Dialogflow CX, and Conversational AI.
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <a href="https://www.linkedin.com/in/gnanamuthugm" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">💼 LinkedIn</a>
                <a href="https://gnanamuthugm.github.io/portfolio/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:underline font-medium">🌐 Portfolio</a>
                <a href="https://github.com/gnanamuthugm" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:underline font-medium">🐙 GitHub</a>
                <button
                  onClick={() => downloadArticlePDF(article)}
                  className="text-sm text-green-600 hover:underline font-medium flex items-center gap-1"
                >
                  📥 Download Article
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-World Example AFTER About Author */}
        {article.realWorldExample && (
          <div className="bg-green-50 border border-green-200 p-5 rounded-2xl mb-8">
            <h3 className="font-bold text-green-800 mb-2">🌍 Real-World Example</h3>
            <p className="text-green-700 text-sm leading-relaxed">{article.realWorldExample}</p>
          </div>
        )}

        <QuizSection questions={article.quiz || []} />
        <CommentsSection articleSlug={article.slug} />
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-8">
        <p>Learn Daily by <a href="https://www.linkedin.com/in/gnanamuthugm" className="text-blue-500 hover:underline">Gnanamuthu G</a></p>
      </footer>
    </div>
  );
}
