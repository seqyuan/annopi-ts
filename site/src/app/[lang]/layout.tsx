import { RootProvider } from 'fumadocs-ui/provider/next'
import '../global.css'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { i18nProvider } from 'fumadocs-ui/i18n'
import { translations } from '@/lib/layout.shared'
import { i18n, resolveLocale } from '@/lib/i18n'

const inter = Inter({
  subsets: ['latin'],
})

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>
  children: ReactNode
}) {
  const { lang } = await params
  const locale = resolveLocale(lang)

  return (
    <html lang={locale} className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={i18nProvider(translations, locale)}>
          {children}
        </RootProvider>
      </body>
    </html>
  )
}

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }))
}
