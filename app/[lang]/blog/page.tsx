import { Suspense } from 'react'
import Link from 'next/link'
import { getAllArticles, getAllCategories, searchArticles } from '@/lib/articles'
import { SUPPORTED_LANGUAGES } from '@/lib/client-utils'
import BlogCard from '@/components/BlogCard'
import SearchBar from '@/components/SearchBar'
import CategoryBadge from '@/components/CategoryBadge'
import CategorySelector from '@/components/CategorySelector'

interface BlogPageProps {
  params: Promise<{
    lang: string
  }>
  searchParams: Promise<{
    search?: string
    category?: string
  }>
}

function BlogLoading() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-6 bg-gray-200 rounded mb-3"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

function BlogContent({ lang, searchParams }: { lang: string; searchParams: { search?: string; category?: string } }) {
  let articles = getAllArticles(lang as any)
  
  // Apply search filter
  if (searchParams.search) {
    articles = searchArticles(searchParams.search, lang as any)
  }
  
  // Apply category filter
  if (searchParams.category) {
    articles = articles.filter(article => 
      article.category.toLowerCase() === searchParams.category?.toLowerCase()
    )
  }

  const categories = getAllCategories(lang as any)
  const currentCategory = searchParams.category

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                CCAIP Daily Blog
              </h1>
              <p className="text-gray-600">
                Expert insights on Contact Center AI, Conversational AI, and customer service automation
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchBar placeholder="Search CCAIP articles..." className="w-full sm:w-64" />
              <CategorySelector 
                categories={categories} 
                currentCategory={currentCategory} 
                lang={lang} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <Link
                  href={`/${lang}/blog`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                    !currentCategory
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/${lang}/blog?category=${encodeURIComponent(category)}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                      currentCategory === category
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Active Filters */}
            {(searchParams.search || currentCategory) && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {searchParams.search && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Search: {searchParams.search}
                      <Link
                        href={`/${lang}/blog${currentCategory ? `?category=${currentCategory}` : ''}`}
                        className="ml-2 hover:text-blue-600"
                      >
                        ×
                      </Link>
                    </span>
                  )}
                  {currentCategory && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Category: {currentCategory}
                      <Link
                        href={`/${lang}/blog${searchParams.search ? `?search=${searchParams.search}` : ''}`}
                        className="ml-2 hover:text-blue-600"
                      >
                        ×
                      </Link>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
              </p>
            </div>

            {/* Articles Grid */}
            <Suspense fallback={<BlogLoading />}>
              {articles.length > 0 ? (
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
                  {articles.map((article) => (
                    <BlogCard key={article.slug} article={article} lang={lang} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No articles found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchParams.search || currentCategory
                      ? 'Try adjusting your filters or search terms'
                      : 'Check back later for new content'}
                  </p>
                  {(searchParams.search || currentCategory) && (
                    <Link
                      href={`/${lang}/blog`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Clear Filters
                    </Link>
                  )}
                </div>
              )}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { lang } = await params
  const resolvedSearchParams = await searchParams

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(lang as any)) {
    return null // Will be handled by error page
  }

  return <BlogContent lang={lang} searchParams={resolvedSearchParams} />
}
