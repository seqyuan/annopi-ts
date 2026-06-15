import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import type { Metadata } from "next";
import { localePath, resolveLocale, type Locale } from "@/lib/i18n";

const ui: Record<Locale, {
  title: string
  description: string
  back: string
  heading: string
  subtitle: string
  sectionMap: Record<string, string>
}> = {
  en: {
    title: "Changelog — annopi-ts",
    description: "Release history for annopi-ts",
    back: "← Back to annopi-ts",
    heading: "Changelog",
    subtitle: "Release history for annopi-ts",
    sectionMap: {},
  },
  zh: {
    title: "更新日志 — annopi-ts",
    description: "annopi-ts 版本发布记录",
    back: "← 返回 annopi-ts",
    heading: "更新日志",
    subtitle: "annopi-ts 版本发布记录（条目内容为英文原文）",
    sectionMap: { Changes: "变更", Fixes: "修复" },
  },
};

function parseChangelog(markdown: string): Array<{ version: string; sections: Array<{ heading: string; items: string[] }> }> {
  const entries: Array<{ version: string; sections: Array<{ heading: string; items: string[] }> }> = [];
  const lines = markdown.split("\n");
  let currentVersion = "";
  let currentSection = "";
  let currentItems: string[] = [];
  let inChangelog = false;

  for (const line of lines) {
    const versionMatch = line.match(/^##\s+(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      if (currentVersion && currentItems.length > 0) {
        const sections = entries.find((e) => e.version === currentVersion)?.sections;
        if (sections) {
          sections.push({ heading: currentSection, items: [...currentItems] });
        }
      }
      currentVersion = versionMatch[1];
      currentSection = "";
      currentItems = [];
      entries.push({ version: currentVersion, sections: [] });
      inChangelog = true;
      continue;
    }
    if (!inChangelog) continue;

    const sectionMatch = line.match(/^###\s+(.+)/);
    if (sectionMatch) {
      if (currentSection && currentItems.length > 0) {
        const entry = entries.find((e) => e.version === currentVersion);
        if (entry) entry.sections.push({ heading: currentSection, items: [...currentItems] });
      }
      currentSection = sectionMatch[1];
      currentItems = [];
      continue;
    }

    if (line.startsWith("- ")) {
      currentItems.push(line.slice(2).trim());
    }
  }
  if (currentVersion && currentSection && currentItems.length > 0) {
    const entry = entries.find((e) => e.version === currentVersion);
    if (entry) entry.sections.push({ heading: currentSection, items: [...currentItems] });
  }

  return entries;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = ui[locale];
  return { title: copy.title, description: copy.description };
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = ui[locale];

  let markdown = "";
  try {
    markdown = readFileSync(join(process.cwd(), "..", "CHANGELOG.md"), "utf8");
  } catch {
    markdown = "# Changelog\n\nChangelog not available.\n";
  }

  const entries = parseChangelog(markdown);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <Link
          href={localePath(locale, "/")}
          style={{
            fontSize: 14,
            color: "var(--fd-muted-foreground)",
            textDecoration: "none",
          }}
        >
          {copy.back}
        </Link>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            marginTop: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          {copy.heading}
        </h1>
        <p style={{ color: "var(--fd-muted-foreground)", fontSize: "0.95rem" }}>
          {copy.subtitle}
        </p>
      </div>

      {entries.map((entry) => (
        <div
          key={entry.version}
          style={{
            marginBottom: "3rem",
            borderBottom: "1px solid var(--fd-border)",
            paddingBottom: "2rem",
          }}
        >
          <h2
            id={entry.version}
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1rem",
              scrollMarginTop: "5rem",
            }}
          >
            <a
              href={`#${entry.version}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {entry.version}
            </a>
          </h2>
          {entry.sections.map((section) => (
            <div key={section.heading} style={{ marginBottom: "1.25rem" }}>
              <h3
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--fd-muted-foreground)",
                  marginBottom: "0.5rem",
                }}
              >
                {copy.sectionMap[section.heading] ?? section.heading}
              </h3>
              <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: 1.7,
                      color: "var(--fd-foreground)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
