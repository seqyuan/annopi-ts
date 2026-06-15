import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { uiTranslations } from 'fumadocs-ui/i18n'
import { appName, gitConfig } from './shared'
import { i18n, localePath, type Locale, resolveLocale } from './i18n'
import { BookOpenText, Download, ScrollText } from 'lucide-react'

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add('ui', {
    en: {
      displayName: 'English',
    },
    zh: {
      displayName: '中文',
      search: '搜索文档',
      searchNoResult: '未找到结果',
      toc: '本页目录',
      chooseLanguage: '选择语言',
      nextPage: '下一页',
      previousPage: '上一页',
      chooseTheme: '主题',
      editOnGithub: '在 GitHub 上编辑',
    },
  })

const navLabels: Record<Locale, { docs: string; install: string; changelog: string }> = {
  en: { docs: 'Docs', install: 'Install', changelog: 'Changelog' },
  zh: { docs: '文档', install: '安装', changelog: '更新日志' },
}

export function baseOptions(lang: string): BaseLayoutProps {
  const locale = resolveLocale(lang)
  const labels = navLabels[locale]

  return {
    nav: {
      title: appName,
      url: localePath(locale, '/'),
    },
    links: [
      {
        text: labels.docs,
        url: localePath(locale, '/docs'),
        icon: <BookOpenText size={16} />,
        active: 'nested-url',
      },
      {
        text: labels.install,
        url: localePath(locale, '/docs/quick-start'),
        icon: <Download size={16} />,
        active: 'nested-url',
      },
      {
        text: labels.changelog,
        url: localePath(locale, '/changelog'),
        icon: <ScrollText size={16} />,
        active: 'nested-url',
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  }
}
