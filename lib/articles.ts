import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Language, generateExcerpt } from '@/lib/client-utils'

export interface Article {
  slug: string
  title: string
  description: string
  content: string
  author: string
  publishedAt: string
  category: string
  tags: string[]
  language: Language
  readingTime: number
}

export interface ArticleListItem {
  slug: string
  title: string
  description: string
  author: string
  publishedAt: string
  category: string
  tags: string[]
  language: Language
  readingTime: number
}

const contentDirectory = path.join(process.cwd(), 'content/articles')

export function getArticleSlugs(lang: Language): string[] {
  try {
    const fullPath = path.join(contentDirectory, lang)
    if (!fs.existsSync(fullPath)) return []
    
    const fileNames = fs.readdirSync(fullPath)
    return fileNames
      .filter(name => name.endsWith('.md'))
      .map(name => name.replace(/\.md$/, ''))
  } catch {
    return []
  }
}

export function getArticleBySlug(slug: string, lang: Language): Article | null {
  try {
    const fullPath = path.join(contentDirectory, lang, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) return null
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    const readingTime = Math.ceil(content.split(/\s+/).length / 200) // Assuming 200 words per minute
    
    return {
      slug,
      title: data.title || '',
      description: data.description || '',
      content,
      author: data.author || 'Anonymous',
      publishedAt: data.publishedAt || new Date().toISOString(),
      category: data.category || 'general',
      tags: data.tags || [],
      language: lang,
      readingTime
    }
  } catch {
    return null
  }
}

export function getAllArticles(lang: Language): ArticleListItem[] {
  const slugs = getArticleSlugs(lang)
  const articles = slugs
    .map(slug => getArticleBySlug(slug, lang))
    .filter((article): article is Article => article !== null)
    .map(({ content, ...article }) => article) // Exclude content from list view
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  
  return articles
}

export function getArticlesByCategory(category: string, lang: Language): ArticleListItem[] {
  const articles = getAllArticles(lang)
  return articles.filter(article => article.category.toLowerCase() === category.toLowerCase())
}

export function getArticlesByTag(tag: string, lang: Language): ArticleListItem[] {
  const articles = getAllArticles(lang)
  return articles.filter(article => 
    article.tags.some(articleTag => articleTag.toLowerCase() === tag.toLowerCase())
  )
}

export function searchArticles(query: string, lang: Language): ArticleListItem[] {
  const articles = getAllArticles(lang)
  const lowercaseQuery = query.toLowerCase()
  
  return articles.filter(article =>
    article.title.toLowerCase().includes(lowercaseQuery) ||
    article.description.toLowerCase().includes(lowercaseQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    article.category.toLowerCase().includes(lowercaseQuery)
  )
}

export function getRelatedArticles(currentArticle: Article, limit: number = 3): ArticleListItem[] {
  const articles = getAllArticles(currentArticle.language)
  
  // Filter out the current article
  const otherArticles = articles.filter(article => article.slug !== currentArticle.slug)
  
  // Score articles based on category and tags
  const scoredArticles = otherArticles.map(article => {
    let score = 0
    
    // Same category gets higher score
    if (article.category === currentArticle.category) {
      score += 3
    }
    
    // Shared tags increase score
    const sharedTags = article.tags.filter(tag => 
      currentArticle.tags.includes(tag)
    )
    score += sharedTags.length
    
    return { article, score }
  })
  
  // Sort by score and take top results
  return scoredArticles
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => article)
}

export function getAllCategories(lang: Language): string[] {
  const articles = getAllArticles(lang)
  const categories = articles.map(article => article.category)
  return [...new Set(categories)].sort()
}

export function getAllTags(lang: Language): string[] {
  const articles = getAllArticles(lang)
  const allTags = articles.flatMap(article => article.tags)
  return [...new Set(allTags)].sort()
}
