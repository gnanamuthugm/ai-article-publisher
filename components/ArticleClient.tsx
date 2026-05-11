"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import QuizSection from "@/components/QuizSection";
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

// ── Download Article as .txt in current language ─────────────
function downloadArticleTxt(article: Article, currentContent: string) {
  const stripHtml = (html: string) =>
    html
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n== $1 ==\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n-- $1 --\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '  • $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const content = [
    article.title,
    '='.repeat(article.title.length),
    '',
    `Date: ${article.date} | Category: ${article.categoryName}`,
    '',
    '📌 Summary:',
    article.summary,
    '',
    '─'.repeat(60),
    '',
    stripHtml(currentContent),
    '',
    '─'.repeat(60),
    '',
    '🌍 Real-World Example:',
    article.realWorldExample || '',
    '',
    '⭐ Key Takeaways:',
    ...(article.keyPoints?.map((p, i) => `${i + 1}. ${p}`) || []),
    '',
    '─'.repeat(60),
    '',
    '❓ Quiz Questions:',
    ...(article.quiz?.flatMap((q: any, i: number) => [
      `Q${i + 1}: ${q.question}`,
      ...q.options.map((o: string) => `  ${o.startsWith(q.answer) ? '✓ ' : '  '}${o}`),
      '',
    ]) || []),
    '─'.repeat(60),
    '',
    'Gnanamuthu G — AI & Contact Center Expert',
    'LinkedIn: https://www.linkedin.com/in/gnanamuthugm',
    'Portfolio: https://gnanamuthugm.github.io/portfolio',
    'Interview Questions: https://topmate.io/gnanamuthugm',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${article.slug}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PDF Download — jsPDF + html2canvas → true .pdf file ──
async function downloadArticlePDF(article: Article, currentContent: string) {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const stripHtml = (html: string) =>
    html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const quizHtml = article.quiz?.length
    ? article.quiz.map((q: any, i: number) => `
        <div style="margin-bottom:20px;padding:14px 16px;background:#f8f9ff;border-left:4px solid #3b82f6;border-radius:6px;page-break-inside:avoid;">
          <p style="font-weight:700;color:#1e3a8a;margin:0 0 10px 0;font-size:14px;">Q${i + 1}: ${q.question}</p>
          ${q.options.map((opt: string) => `
            <p style="margin:4px 0;font-size:13px;color:${opt.startsWith(q.answer) ? '#166534' : '#374151'};font-weight:${opt.startsWith(q.answer) ? '700' : '400'};">
              ${opt.startsWith(q.answer) ? '✓ ' : ''}${opt}
            </p>`).join('')}
        </div>`).join('')
    : '';

  const keyPointsHtml = article.keyPoints?.length
    ? article.keyPoints.map(p => `
        <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;">
          <span style="color:#d97706;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#92400e;line-height:1.7;">${p}</span>
        </div>`).join('')
    : '';

  // Process HTML — no gis flag
  let contentHtml = currentContent;
  contentHtml = contentHtml.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
    (_: string, _a: string, t: string) => `<h2 style="font-size:18px;font-weight:700;color:#1e3a8a;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #dbeafe;">${t}</h2>`);
  contentHtml = contentHtml.replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi,
    (_: string, _a: string, t: string) => `<h3 style="font-size:15px;font-weight:700;color:#1d4ed8;margin:22px 0 8px;">${t}</h3>`);
  contentHtml = contentHtml.replace(/<h4([^>]*)>([\s\S]*?)<\/h4>/gi,
    (_: string, _a: string, t: string) => `<h4 style="font-size:14px;font-weight:600;color:#2563eb;margin:16px 0 6px;">${t}</h4>`);
  contentHtml = contentHtml.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi,
    (_: string, _a: string, t: string) => `<p style="margin:0 0 16px;line-height:1.85;font-size:13px;color:#374151;">${t}</p>`);
  contentHtml = contentHtml.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi,
    (_: string, _a: string, t: string) => `<li style="margin-bottom:8px;font-size:13px;color:#374151;line-height:1.7;">${t}</li>`);
  contentHtml = contentHtml.replace(/<ul([^>]*)>/gi, '<ul style="margin:0 0 16px;padding-left:22px;">');
  contentHtml = contentHtml.replace(/<ol([^>]*)>/gi, '<ol style="margin:0 0 16px;padding-left:22px;">');
  contentHtml = contentHtml.replace(/<strong([^>]*)>([\s\S]*?)<\/strong>/gi,
    (_: string, _a: string, t: string) => `<strong style="font-weight:700;color:#111827;">${t}</strong>`);
  contentHtml = contentHtml.replace(/<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi,
    (_: string, _a: string, t: string) => `<blockquote style="border-left:4px solid #93c5fd;padding:10px 16px;margin:16px 0;background:#eff6ff;border-radius:4px;">${t}</blockquote>`);
  contentHtml = contentHtml.replace(/<code([^>]*)>([\s\S]*?)<\/code>/gi,
    (_: string, _a: string, t: string) => `<code style="background:#f3f4f6;padding:1px 6px;border-radius:3px;font-size:12px;font-family:monospace;color:#dc2626;">${t}</code>`);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${article.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    color: #111827;
    background: white;
  }

  /* 10% margin on all sides = ~29.7mm top/bottom, ~21mm left/right on A4 */
  @page {
    size: A4;
    margin: 10% 10%;
  }

  @media print {
    body { margin: 0; }
  }

  .page { background: white; }

  /* Header — first page only via .first-only class */
  .first-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  .category-badge {
    background: #dbeafe;
    color: #1e40af;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 100px;
    display: inline-block;
  }
  .date-text { font-size: 11px; color: #9ca3af; }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    line-height: 1.3;
    margin: 14px 0 10px;
  }
  .tags { display:flex; gap:5px; flex-wrap:wrap; margin:8px 0 16px; }
  .tag {
    background:#eff6ff; color:#1d4ed8;
    font-size:10px; padding:2px 7px;
    border-radius:100px; font-weight:500;
  }

  .summary-box {
    background:#eff6ff;
    border-left:4px solid #3b82f6;
    padding:12px 16px;
    border-radius:0 8px 8px 0;
    margin:0 0 20px;
  }
  .summary-label { font-size:11px; font-weight:700; color:#1d4ed8; margin-bottom:4px; }
  .summary-text { font-size:13px; color:#1e40af; line-height:1.6; }

  .feature-img {
    width:100%; height:190px;
    object-fit:cover; border-radius:8px;
    margin-bottom:24px; display:block;
  }

  .content-body { margin-bottom:24px; }

  .divider { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }

  .section-box { border-radius:8px; padding:16px 18px; margin-bottom:18px; page-break-inside:avoid; }
  .section-title { font-size:14px; font-weight:700; margin:0 0 12px; }

  .rwe { background:#f0fdf4; border:1px solid #bbf7d0; }
  .rwe .section-title { color:#166534; }
  .rwe p { font-size:13px; color:#14532d; line-height:1.7; margin:0; }

  .key { background:#fffbeb; border:1px solid #fde68a; }
  .key .section-title { color:#92400e; }

  .quiz { background:#f9fafb; border:1px solid #e5e7eb; }
  .quiz .section-title { color:#1e3a8a; }

  .footer {
    margin-top:28px; padding-top:14px;
    border-top:2px solid #dbeafe;
  }
  .footer-author { font-size:12px; font-weight:700; color:#1d4ed8; margin-bottom:4px; }
  .footer-links { font-size:11px; color:#6b7280; }
  .footer-links a { color:#2563eb; text-decoration:none; margin-right:10px; }
</style>
</head>
<body>
<div class="page">

  <!-- First page header -->
  <div class="first-header">
    <span class="category-badge">${article.categoryEmoji} ${article.categoryName}</span>
    <span class="date-text">${new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
  </div>

  <h1>${article.title}</h1>

  <div class="tags">
    ${(article.tags || []).map((t: string) => `<span class="tag">#${t}</span>`).join('')}
  </div>

  <div class="summary-box">
    <div class="summary-label">📌 What you'll learn today</div>
    <div class="summary-text">${article.summary}</div>
  </div>

  <img class="feature-img" src="${article.image}" alt="${article.title}" />

  <div class="content-body">${contentHtml}</div>

  <hr class="divider" />

  ${article.realWorldExample ? `
  <div class="section-box rwe">
    <div class="section-title">🌍 Real-World Example</div>
    <p>${article.realWorldExample}</p>
  </div>` : ''}

  ${keyPointsHtml ? `
  <div class="section-box key">
    <div class="section-title">⭐ Key Takeaways</div>
    ${keyPointsHtml}
  </div>` : ''}

  ${quizHtml ? `
  <div class="section-box quiz">
    <div class="section-title">❓ Quiz Questions</div>
    ${quizHtml}
  </div>` : ''}

  <div class="footer">
    <div class="footer-links">CCAIP Daily — Learn Daily</div>
  </div>

</div>
<script>
  window.onload = function() {
    var img = document.querySelector('.feature-img');
    function doPrint() { setTimeout(function(){ window.print(); }, 500); }
    if (img && !img.complete) {
      img.onload = doPrint;
      img.onerror = doPrint;
    } else {
      doPrint();
    }
  };
</script>
</body>
</html>`;

  // Render HTML in a hidden off-screen container
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:-9999px;width:794px;background:white;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait for images to load
  const images = container.querySelectorAll('img');
  await Promise.all(Array.from(images).map(img =>
    img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })
  ));

  // Small delay for fonts/styles
  await new Promise(res => setTimeout(res, 300));

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 794,
    windowWidth: 794,
  });

  document.body.removeChild(container);

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = pageW * 0.10; // 10% margin
  const printW = pageW - margin * 2;
  const imgPxW = canvas.width;
  const imgPxH = canvas.height;
  const mmPerPx = printW / imgPxW;
  const totalMmH = imgPxH * mmPerPx;
  const printPageH = pageH - margin * 2;

  let yOffset = 0;
  let firstPage = true;
  while (yOffset < totalMmH) {
    if (!firstPage) pdf.addPage();
    firstPage = false;
    const sliceMm = Math.min(printPageH, totalMmH - yOffset);
    const slicePxTop = yOffset / mmPerPx;
    const slicePxH = sliceMm / mmPerPx;
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgPxW;
    sliceCanvas.height = slicePxH;
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, slicePxTop, imgPxW, slicePxH, 0, 0, imgPxW, slicePxH);
    pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, printW, sliceMm);
    yOffset += sliceMm;
  }

  pdf.save(`${article.slug}.pdf`);
}

export default function ArticleClient({ article, lang }: { article: Article; lang: string }) {
  const [displayContent, setDisplayContent] = useState(article.content);
  const [currentLang, setCurrentLang] = useState("en");
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  function handleTranslated(l: string, translated: string) {
    setCurrentLang(l);
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
      } catch (_e) {}
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
          <img src={article.image} alt={article.title} className="w-full rounded-2xl mb-6 shadow-sm object-contain" />
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

        {/* About Author */}
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
                <a href="https://www.linkedin.com/in/gnanamuthugm" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">LinkedIn</a>
                <a href="https://gnanamuthugm.github.io/portfolio/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:underline font-medium">Portfolio</a>
                <a href="https://github.com/gnanamuthugm" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:underline font-medium">GitHub</a>
                {/* Download Article — saves current language as .txt locally */}
                <button
                  onClick={async () => { setPdfLoading(true); await downloadArticlePDF(article, displayContent); setPdfLoading(false); }}
                  disabled={pdfLoading}
                  className="text-sm text-red-600 hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
                  title="Download article as PDF"
                >
                  {pdfLoading ? '⏳ Generating...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-World Example */}
        {article.realWorldExample && (
          <div className="bg-green-50 border border-green-200 p-5 rounded-2xl mb-8">
            <h3 className="font-bold text-green-800 mb-2">🌍 Real-World Example</h3>
            <p className="text-green-700 text-sm leading-relaxed">{article.realWorldExample}</p>
          </div>
        )}

        <QuizSection questions={article.quiz || []} />

        {/* Comments section — hidden for now */}
        {/* <CommentsSection articleSlug={article.slug} /> */}

      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-8">
        <p>Learn Daily by <a href="https://www.linkedin.com/in/gnanamuthugm" className="text-blue-500 hover:underline">Gnanamuthu G</a></p>
      </footer>
    </div>
  );
}
