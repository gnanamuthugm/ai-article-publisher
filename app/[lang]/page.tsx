import Link from "next/link";
import { redirect } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/lib/client-utils";
import articlesData from "@/data/articles.json";

interface HomePageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ category?: string }>;
}

const CATEGORIES = [
  { id: "all",                              label: "All Articles",               emoji: "📚", color: "gray"   },
  { id: "dialogflow-cx",                    label: "Dialogflow CX",              emoji: "🤖", color: "blue"   },
  { id: "conversational-agents-playbook",   label: "Conversational Agents",      emoji: "📖", color: "purple" },
  { id: "ces",                              label: "Customer Effort Score",      emoji: "⭐", color: "green"  },
  { id: "ccaip",                            label: "CCAIP",                      emoji: "🎯", color: "orange" },
];

function categoryBg(color: string, active: boolean) {
  if (!active) return "bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600";
  const map: Record<string, string> = {
    gray:   "bg-gray-800 text-white border-gray-800",
    blue:   "bg-blue-600 text-white border-blue-600",
    purple: "bg-purple-600 text-white border-purple-600",
    green:  "bg-green-600 text-white border-green-600",
    orange: "bg-orange-500 text-white border-orange-500",
  };
  return map[color] || "bg-blue-600 text-white border-blue-600";
}

function cardTagStyle(color: string) {
  const map: Record<string, string> = {
    blue:   "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    green:  "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return map[color] || "bg-gray-100 text-gray-600";
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { lang } = await params;
  const { category } = await searchParams;

  if (!SUPPORTED_LANGUAGES.includes(lang as any)) {
    redirect("/en");
  }

  const allArticles = articlesData as any[];

  const filtered =
    !category || category === "all"
      ? allArticles
      : allArticles.filter((a) => a.category === category);

  const activeCategory = category || "all";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Learn Daily</h1>
          <p className="text-blue-100 text-lg md:text-xl mb-2">
            One concept a day — from zero to expert in AI &amp; Contact Centers
          </p>
          <p className="text-blue-200 text-sm">
            📅 New article every morning at 11:30 AM IST · Dialogflow CX · CCAIP · CES · Conversational AI
          </p>
        </div>
      </section>

      {/* Author Banner */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-4">
          <img
            src="/images/profile.png"
            alt="Gnanamuthu G"
            className="w-14 h-14 rounded-full object-cover border-2 border-blue-100 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-base">Gnanamuthu G</p>
            <p className="text-gray-500 text-sm">
              AI &amp; Contact Center Expert · Google CCAIP Specialist · Helping teams build smarter CX with Dialogflow CX &amp; Conversational AI
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <a href="https://www.linkedin.com/in/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                💼 LinkedIn
              </a>
              <a href="https://github.com/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:underline flex items-center gap-1">
                🐙 GitHub
              </a>
              <a href="https://gnanamuthugm.github.io/portfolio/" target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:underline flex items-center gap-1">
                🌐 Portfolio
              </a>
              <a href="https://topmate.io/gnanamuthugm" target="_blank" rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline flex items-center gap-1">
                📅 Book a call
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/${lang}?category=${cat.id}`}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${categoryBg(
                cat.color,
                activeCategory === cat.id
              )}`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Articles */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-400 mb-6">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}{" "}
          {activeCategory !== "all" &&
            `in ${CATEGORIES.find((c) => c.id === activeCategory)?.label}`}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-xl font-semibold">No articles yet</p>
            <p className="text-sm mt-2">First article publishes tomorrow at 11:30 AM IST!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article: any) => (
              <Link key={article.slug} href={`/${lang}/blog/${article.slug}`}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 h-full flex flex-col">
                  <div className="relative">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-44 object-cover"
                    />
                    <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${cardTagStyle(article.categoryColor)}`}>
                      {article.categoryEmoji} {article.categoryName}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs text-gray-400 mb-2">{article.date}</span>
                    <h3 className="font-bold text-gray-800 text-base leading-snug mb-2 flex-1">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {article.summary}
                    </p>
                    {/* Mini author row */}
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src="/images/profile.png"
                        alt="Gnanamuthu G"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs text-gray-500">Gnanamuthu G</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-blue-600 text-sm font-semibold">Read article →</span>
                      <span className="text-xs text-gray-400">{article.quiz?.length || 0} quiz Qs</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-4">
        <p>Learn Daily by <a href="https://www.linkedin.com/in/gnanamuthugm" className="text-blue-500 hover:underline">Gnanamuthu G</a> · New article every morning at 11:30 AM IST</p>
      </footer>
    </div>
  );
}
