import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware'
import { i18n } from '@/lib/i18n'

function addLocaleToPathname(locale: string, pathname: string): string {
  if (pathname === '/') {
    return `/${locale}`
  }

  return `/${locale}${pathname}`.replace(/\/+/g, '/')
}

export default createI18nMiddleware({
  ...i18n,
  format(locale, pathname) {
    return addLocaleToPathname(locale, pathname)
  },
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
}
