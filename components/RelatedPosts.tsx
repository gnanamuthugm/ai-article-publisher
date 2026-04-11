import Link from 'next/link'
import { formatDate, truncateText } from '@/lib/client-utils'
import { ArticleListItem } from '@/lib/articles'

interface RelatedPostsProps {
  posts: ArticleListItem[]
  lang: string
  className?: string
}

export default function RelatedPosts({ posts, lang, className = '' }: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <div className={className}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Related Articles</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.slug}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {post.category}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(post.publishedAt, lang as any)}
              </span>
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              <Link
                href={`/${lang}/blog/${post.slug}`}
                className="hover:text-blue-600 transition-colors duration-200"
              >
                {post.title}
              </Link>
            </h4>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {post.description}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {post.author} • {post.readingTime} min
              </span>
              
              <Link
                href={`/${lang}/blog/${post.slug}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Read →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
