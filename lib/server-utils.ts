import { headers } from 'next/headers'
import { SUPPORTED_LANGUAGES } from './client-utils'
import type { Language } from './client-utils'

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
