import Link from "next/link";
import articles from "@/data/articles.json";
import QuizSection from "@/components/QuizSection";
import CommentSection from "@/components/CommentSection";

export async function generateStaticParams() {
  return (articles as any[]).map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = (articles as any[]).find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">📭</p>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Article not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to all articles
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero Image */}
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-64 object-cover rounded-2xl mb-6 shadow-sm"
        />

        {/* Meta */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm text-gray-400">{article.date}</span>
          {article.tags?.map((tag: string) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Summary Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-8">
          <p className="font-semibold text-blue-800 mb-1">📌 What you&apos;ll learn today</p>
          <p className="text-blue-700 text-sm">{article.summary}</p>
        </div>

        {/* Main Content */}
        <div
          className="prose prose-lg max-w-none mb-8 text-gray-700
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:leading-relaxed [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
            [&_li]:mb-1 [&_strong]:text-gray-900"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Real World Example */}
        <div className="bg-green-50 border border-green-200 p-5 rounded-2xl mb-8">
          <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
            🌍 Real World Example
          </h3>
          <p className="text-green-700 text-sm leading-relaxed">{article.realWorldExample}</p>
        </div>

        {/* Key Takeaways */}
        <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-2xl mb-8">
          <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
            ⭐ Key Takeaways
          </h3>
          <ul className="space-y-2">
            {article.keyPoints?.map((point: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-yellow-700">
                <span className="text-yellow-500 font-bold mt-0.5">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quiz */}
        <QuizSection questions={article.quiz} />

        {/* Comments */}
        <CommentSection articleId={article.id} />
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-8">
        CCAIP Daily — New article every day at 9:30 AM IST
      </footer>
    </div>
  );
}
