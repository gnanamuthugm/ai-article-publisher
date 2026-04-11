import { headers } from 'next/headers'

export const SUPPORTED_LANGUAGES = ['en', 'ta', 'hi', 'te'] as const
export type Language = typeof SUPPORTED_LANGUAGES[number]

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  te: 'తెలుగు'
}

export function getBrowserLanguage(): Language {
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language.split('-')[0] as Language
    return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en'
  }
  return 'en'
}

export async function getServerLanguage(): Promise<Language> {
  try {
    const headersList = await headers()
    const acceptLanguage = headersList.get('accept-language')
    if (acceptLanguage) {
      const browserLang = acceptLanguage.split(',')[0].split('-')[0] as Language
      return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en'
    }
  } catch {
    // Fallback if headers are not available
  }
  return 'en'
}

export function formatDate(date: string | Date, lang: Language = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

export function generateExcerpt(content: string, maxLength: number = 150): string {
  // Remove markdown syntax
  const plainText = content
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
  
  return truncateText(plainText, maxLength)
}
