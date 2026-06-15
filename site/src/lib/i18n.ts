import { defineI18n } from 'fumadocs-core/i18n'

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
  hideLocale: 'default-locale',
  parser: 'dir',
  fallbackLanguage: 'en',
})

export type Locale = (typeof i18n.languages)[number]

export function resolveLocale(lang: string): Locale {
  return i18n.languages.includes(lang as Locale) ? (lang as Locale) : i18n.defaultLanguage
}

export function localePath(lang: string, path: string): string {
  const locale = resolveLocale(lang)
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (locale === i18n.defaultLanguage && i18n.hideLocale === 'default-locale') {
    return normalized
  }
  if (normalized === '/') return `/${locale}`
  return `/${locale}${normalized}`
}
