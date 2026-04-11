import Link from "next/link";
import articles from "@/data/articles.json";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-700">CCAIP Daily</h1>
            <p className="text-xs text-gray-500">One concept a day — ace your exam</p>
          </div>
          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
            {articles.length} Articles
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 px-4 text-center">
        <h2 className="text-3xl font-bold mb-2">Master CCAIP One Day at a Time</h2>
        <p className="text-blue-100 text-lg">Daily articles with real-world examples, key points & quizzes</p>
      </div>

      {/* Articles Grid */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        {articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-xl">First article coming soon!</p>
            <p className="text-sm mt-2">Check back tomorrow</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {articles.map((article: any) => (
              <Link key={article.id} href={`/article/${article.slug}`}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">{article.date}</span>
                      {article.tags?.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-lg leading-snug mb-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{article.summary}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-blue-600 text-sm font-medium">Read article →</span>
                      <span className="text-xs text-gray-400">
                        {article.quiz?.length || 0} quiz questions
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100">
        CCAIP Daily — New article every day at 9:30 AM IST
      </footer>
    </div>
  );
}
