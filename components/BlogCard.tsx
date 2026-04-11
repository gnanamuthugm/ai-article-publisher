import Link from 'next/link'
import { formatDate, truncateText } from '@/lib/client-utils'
import { ArticleListItem } from '@/lib/articles'

interface BlogCardProps {
  article: ArticleListItem
  lang: string
}

export default function BlogCard({ article, lang }: BlogCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
            {article.category}
          </span>
          <span className="text-sm text-gray-500">
            {formatDate(article.publishedAt, lang as any)}
          </span>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          <Link 
            href={`/${lang}/blog/${article.slug}`}
            className="hover:text-blue-600 transition-colors duration-200"
          >
            {article.title}
          </Link>
        </h2>
        
        <p className="text-gray-600 mb-4 line-clamp-3">
          {truncateText(article.description, 150)}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <span className="font-medium">{article.author}</span>
            <span className="mx-2">•</span>
            <span>{article.readingTime} min read</span>
          </div>
          
          <Link
            href={`/${lang}/blog/${article.slug}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
          >
            Read More
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        
        {article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded"
              >
                #{tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="inline-block px-2 py-1 text-xs text-gray-500">
                +{article.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
