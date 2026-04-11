"use client";
import { useState } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import QuizSection from "@/components/QuizSection";
import CommentsSection from "@/components/CommentsSection";

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

export default function ArticleClient({ article, lang }: { article: Article; lang: string }) {
  const [displayContent, setDisplayContent] = useState(article.content);
  const [currentLang, setCurrentLang] = useState("en");

  function handleTranslated(lang: string, translated: string) {
    setCurrentLang(lang);
    setDisplayContent(translated);
  }

  const categoryStyle = getCategoryStyle(article.categoryColor || "blue");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
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
        {/* Hero Image */}
        {article.image && (
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-64 object-cover rounded-2xl mb-6 shadow-sm"
          />
        )}

        {/* Date + Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm text-gray-400">{article.date}</span>
          {article.tags?.map((tag: string) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{article.title}</h1>

        {/* Author row — top of article */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <img
            src="/images/profile.png"
            alt="Gnanamuthu G"
            className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 flex-shrink-0"
          />
          <div>
            <p className="font-semibold text-gray-900 text-sm">Gnanamuthu G</p>
            <p className="text-gray-500 text-xs">AI &amp; Contact Center Expert · Google CCAIP Specialist</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <a href="https://www.linkedin.com/in/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline">💼 LinkedIn</a>
              <a href="https://gnanamuthugm.github.io/portfolio/" target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:underline">🌐 Portfolio</a>
              <a href="https://topmate.io/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline">📅 Book a call</a>
              <a href="https://github.com/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:underline">🐙 GitHub</a>
            </div>
          </div>
        </div>

        {/* Summary box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-8">
          <p className="font-semibold text-blue-800 mb-1">📌 What you&apos;ll learn today</p>
          <p className="text-blue-700 text-sm leading-relaxed">{article.summary}</p>
        </div>

        {/* Article Content */}
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

        {/* Real-World Example */}
        {article.realWorldExample && (
          <div className="bg-green-50 border border-green-200 p-5 rounded-2xl mb-8">
            <h3 className="font-bold text-green-800 mb-2">🌍 Real-World Example</h3>
            <p className="text-green-700 text-sm leading-relaxed">{article.realWorldExample}</p>
          </div>
        )}

        {/* Key Takeaways */}
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

        {/* Quiz */}
        <QuizSection questions={article.quiz || []} />

        {/* Comments */}
        <CommentsSection articleSlug={article.slug} />

        {/* Author Bio — bottom of article */}
        <div className="mt-10 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">About the Author</p>
          <div className="flex items-start gap-4">
            <img
              src="/images/profile.png"
              alt="Gnanamuthu G"
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 flex-shrink-0"
            />
            <div>
              <p className="font-bold text-gray-900 text-base">Gnanamuthu G</p>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                AI &amp; Contact Center specialist with hands-on expertise in Google CCAIP, Dialogflow CX, and Conversational AI. 
                Passionate about helping teams build intelligent customer experiences and crack the CCAIP certification.
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <a href="https://www.linkedin.com/in/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium">💼 LinkedIn</a>
                <a href="https://gnanamuthugm.github.io/portfolio/" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:underline font-medium">🌐 Portfolio</a>
                <a href="https://github.com/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:underline font-medium">🐙 GitHub</a>
                <a href="https://topmate.io/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline font-medium">📅 Book a 1:1 call</a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-8">
        <p>Learn Daily by <a href="https://www.linkedin.com/in/gnanamuthugm" className="text-blue-500 hover:underline">Gnanamuthu G</a> · New article every morning at 11:30 AM IST</p>
      </footer>
    </div>
  );
}
