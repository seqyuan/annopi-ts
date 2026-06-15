import Link from 'next/link'
import { getHomeContent, quickStartCode } from '@/lib/home-i18n'
import { localePath, resolveLocale } from '@/lib/i18n'

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = resolveLocale(lang)
  const t = getHomeContent(locale)

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto px-6 py-16 gap-16">
      <section className="text-center">
        <h1 className="text-5xl font-bold mb-4">annopi-ts</h1>
        <p className="text-xl text-fd-muted-foreground mb-3">{t.heroSubtitle}</p>
        <p className="text-fd-muted-foreground max-w-2xl mx-auto mb-8">{t.heroBody}</p>
        <div className="flex flex-row gap-4 justify-center">
          <Link
            href={localePath(locale, '/docs')}
            className="inline-flex items-center rounded-full px-8 py-3 bg-fd-primary text-fd-primary-foreground font-medium"
          >
            {t.ctaStart}
          </Link>
          <Link
            href={localePath(locale, '/docs/quick-start')}
            className="inline-flex items-center rounded-full px-8 py-3 border font-medium"
          >
            {t.ctaInstall}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2 text-center">{t.whyTitle}</h2>
        <p className="text-center text-fd-muted-foreground mb-8 max-w-2xl mx-auto">{t.whyIntro}</p>
        <h3 className="text-lg font-medium text-center text-fd-muted-foreground mb-4">{t.problemsTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {t.problems.map((p) => (
            <div key={p.title} className="border rounded-xl p-5 bg-fd-card/50">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h4 className="font-semibold mb-2 text-sm">{p.title}</h4>
              <p className="text-sm text-fd-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
        <h3 className="text-lg font-medium text-center text-fd-primary mb-4">{t.solutionsTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {t.solutions.map((s) => (
            <div key={s.title} className="border border-fd-primary/30 rounded-xl p-5 bg-fd-primary/5">
              <div className="text-3xl mb-3">{s.icon}</div>
              <h4 className="font-semibold mb-2 text-sm">{s.title}</h4>
              <p className="text-sm text-fd-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">{t.featuresTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.features.map((f) => (
            <div key={f.title} className="border rounded-xl p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-fd-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">{t.seeActionTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-xl overflow-hidden bg-fd-card">
            <div className="bg-fd-muted px-4 py-2 border-b text-xs font-medium text-fd-muted-foreground">
              {t.previewPipeline}
            </div>
            <pre className="p-4 font-mono text-xs overflow-auto h-[200px]">
{`name: scRNA_pipeline
tasks:
  cellranger:
    command: |
      cellranger count --id=\${sample_id}
    resources:
      executor: qsubsge
  qc:
    command: qc_script.py --input \${input_dir}
    resources:
      executor: local
dependencies:
  qc: [cellranger]`}
            </pre>
          </div>

          <div className="border rounded-xl overflow-hidden bg-fd-card">
            <div className="bg-fd-muted px-4 py-2 border-b text-xs font-medium text-fd-muted-foreground">
              {t.previewTasks}
            </div>
            <pre className="p-4 font-mono text-xs overflow-auto h-[200px]">
{`tasks:
  1-0-cellranger:
    runcmd: annotask qsubsge -i shell/1-0-cellranger.sh ...
    depends: []
  2-0-qc:
    runcmd: ata -i shell/2-0-qc.sh -l 4 -t 10
    depends: [1-0-cellranger]`}
            </pre>
          </div>

          <div className="border rounded-xl overflow-hidden bg-fd-card">
            <div className="bg-fd-muted px-4 py-2 border-b text-xs font-medium text-fd-muted-foreground">
              {t.previewRunners}
            </div>
            <pre className="p-4 font-mono text-xs overflow-auto h-[160px]">
{`# local: no "local" subcommand
\${localRunner} -i script.sh -l N -t M

# qsubsge: annotask subcommand
\${annotaskRunner} qsubsge -i script.sh \\
  -l N -t M --cpu C --queue Q`}
            </pre>
          </div>

          <div className="border rounded-xl overflow-hidden bg-fd-card">
            <div className="bg-fd-muted px-4 py-2 border-b text-xs font-medium text-fd-muted-foreground">
              {t.previewDeps}
            </div>
            <pre className="p-4 font-mono text-xs overflow-auto h-[160px]">
{`deps:
  ata: /Volumes/data/GOPATH/bin/ata
  annotask: /opt/annotask
  cellranger: /opt/cellranger-7.0.0`}
            </pre>
          </div>

          <div className="border rounded-xl overflow-hidden bg-fd-card md:col-span-2">
            <div className="bg-fd-muted px-4 py-2 border-b text-xs font-medium text-fd-muted-foreground">
              Workflow
            </div>
            <div className="p-5 flex items-center justify-center min-h-[120px]">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {t.workflowLabels.map((label, i, arr) => (
                  <div key={label} className="flex items-center gap-0">
                    <div className="rounded-lg border px-3 py-2 text-xs font-medium bg-fd-card whitespace-nowrap">
                      {label}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="text-fd-muted-foreground text-lg mx-1">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2 text-center">{t.architectureTitle}</h2>
        <p className="text-center text-fd-muted-foreground mb-6 max-w-2xl mx-auto">{t.architectureIntro}</p>
        <pre className="border rounded-xl p-6 text-sm overflow-x-auto bg-fd-card/60 text-center">
{`pipeline.yml + project.yml
        │
        ▼
  @seqyuan/annopi-core   (parse, validate, resolve, DAG)
        │
        ▼
  @seqyuan/annopi-node    (generate shell/*.sh, tasks.yml, run)
        │
        ▼
  annopi CLI              (conf / run / install)`}
        </pre>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">{t.installTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {t.installSteps.map((s) => (
            <div key={s.step} className="border rounded-xl p-5">
              <div className="text-fd-primary font-bold text-sm mb-2">{s.step}</div>
              <h3 className="font-semibold mb-2 text-sm">{s.title}</h3>
              {s.desc && (
                <p className="text-sm text-fd-muted-foreground mb-2">
                  {s.desc}{' '}
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noreferrer" className="text-fd-primary underline">
                      {s.linkText}
                    </a>
                  )}
                </p>
              )}
              {s.code && (
                <pre className="text-xs bg-fd-muted rounded-lg p-2.5 overflow-x-auto">
                  <code>{s.code}</code>
                </pre>
              )}
              {s.note && (
                <p className="text-[11px] text-fd-muted-foreground mt-2 leading-relaxed">{s.note}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-6 bg-fd-card/60 text-center">
        <h2 className="text-2xl font-semibold mb-2">关注公众号获取更新</h2>
        <p className="text-fd-muted-foreground mb-2">
          微信公众号搜索 <span className="font-semibold text-fd-foreground">seqyuan</span>，查看 annopi、ata、annotask 与生信流程编排教程。
        </p>
      </section>

      <section className="border rounded-xl overflow-hidden">
        <div className="bg-fd-muted px-6 py-3 border-b text-sm font-medium">{t.quickStartTitle}</div>
        <pre className="p-6 text-sm overflow-x-auto">
          <code>{quickStartCode}</code>
        </pre>
      </section>
    </div>
  )
}
