import type { Locale } from './i18n'

export interface HomeCard {
  icon: string
  title: string
  desc: string
}

export interface HomeInstallStep {
  step: string
  title: string
  desc?: string
  link?: string
  linkText?: string
  code?: string
  note?: string
}

export interface HomeContent {
  heroSubtitle: string
  heroBody: string
  ctaStart: string
  ctaInstall: string
  whyTitle: string
  whyIntro: string
  problemsTitle: string
  solutionsTitle: string
  featuresTitle: string
  seeActionTitle: string
  previewPipeline: string
  previewTasks: string
  previewRunners: string
  previewDeps: string
  architectureTitle: string
  architectureIntro: string
  installTitle: string
  quickStartTitle: string
  problems: HomeCard[]
  solutions: HomeCard[]
  features: HomeCard[]
  installSteps: HomeInstallStep[]
  workflowLabels: string[]
}

const en: HomeContent = {
  heroSubtitle: 'YAML Pipelines → Shell Scripts → DAG Execution',
  heroBody:
    'TypeScript rewrite of annopi — a bioinformatics workflow engine that expands pipeline.yml and project.yml into shell scripts and tasks.yml, then runs them locally via ata or on SGE clusters via annotask.',
  ctaStart: 'Get Started',
  ctaInstall: 'Installation Guide',
  whyTitle: 'Why annopi-ts',
  whyIntro:
    'Bioinformatics pipelines need reproducible orchestration without rewriting glue scripts for every project.',
  problemsTitle: 'Common Pain Points',
  solutionsTitle: 'How annopi-ts Helps',
  featuresTitle: 'Features',
  seeActionTitle: 'How It Works',
  previewPipeline: 'pipeline.yml + project.yml',
  previewTasks: 'Generated tasks.yml',
  previewRunners: 'Runner paths (ata / annotask)',
  previewDeps: 'Global deps in pipeline',
  architectureTitle: 'Architecture',
  architectureIntro:
    'annopi-ts splits pure logic (core) from I/O and runtime (node), exposing a CLI for conf / run / install.',
  installTitle: 'Installation',
  quickStartTitle: 'Quick Start Commands',
  problems: [
    {
      icon: '📝',
      title: 'Ad-hoc Shell Scripts',
      desc: 'Every project reinvents sample loops, dependency ordering, and resume logic in brittle bash.',
    },
    {
      icon: '🔀',
      title: 'Local vs Cluster Divergence',
      desc: 'The same task needs different wrappers for local execution and SGE submission — easy to get out of sync.',
    },
    {
      icon: '🐍',
      title: 'Python-Only Runtime',
      desc: 'The original annopi works well but a TypeScript engine enables tighter integration with Node tooling and annovibe.',
    },
  ],
  solutions: [
    {
      icon: '📋',
      title: 'Declarative YAML',
      desc: 'Define tasks, params, dependencies, and resources once. annopi conf expands them per sample and writes shell/*.sh.',
    },
    {
      icon: '⚙️',
      title: 'Unified Runners',
      desc: 'local mode uses ata or annotask with -i/-l/-t (no local subcommand). qsubsge mode uses annotask qsubsge with cluster options.',
    },
    {
      icon: '🔄',
      title: 'Python ↔ TS Interop',
      desc: 'Python annopi and annopi-ts can read the same configs and execute each other\'s tasks.yml.',
    },
  ],
  features: [
    {
      icon: '🧩',
      title: 'ParamResolver',
      desc: 'Expands single, sample, and cmp parameter modes with cross-references and optional blocks.',
    },
    {
      icon: '📦',
      title: 'Task Modules',
      desc: 'Load tasks via imports, path, or inline definitions with deps merge from pipeline and modules.',
    },
    {
      icon: '📜',
      title: 'Script Generation',
      desc: 'Produces annotask-compatible shell/*.sh and tasks.yml with runcmd for each numbered task.',
    },
    {
      icon: '✅',
      title: '.sign Checkpoints',
      desc: 'Resume pipelines by writing .sign files — run skips completed tasks automatically.',
    },
    {
      icon: '🖥️',
      title: 'CLI',
      desc: 'annopi conf, annopi run, annopi install — same surface as Python annopi for V1 scope.',
    },
    {
      icon: '📊',
      title: 'Report (planned)',
      desc: 'Report rendering is out of V1 scope; design targets ../rst instead of Jinja2 + Sphinx.',
    },
  ],
  installSteps: [
    {
      step: '01',
      title: 'Prerequisites',
      desc: 'Node.js ≥ 18, pnpm, and ata for local execution. annotask is required for qsubsge mode.',
    },
    {
      step: '02',
      title: 'Clone & Install',
      code: 'git clone https://github.com/seqyuan/annopi-ts.git\ncd annopi-ts\npnpm install\npnpm build',
    },
    {
      step: '03',
      title: 'Configure a Pipeline',
      code: 'node packages/cli/dist/cli.js conf \\\n  -p tests/fixtures/annopi/pipeline.yml \\\n  -c tests/fixtures/annopi/project.yml \\\n  -o /tmp/annopi-out',
    },
    {
      step: '04',
      title: 'Run Tasks',
      code: 'node packages/cli/dist/cli.js run -o /tmp/annopi-out',
      note: 'Completed tasks get a .sign file in shell/. Re-run resumes from pending tasks.',
    },
  ],
  workflowLabels: ['pipeline.yml', 'conf', 'shell/*.sh', 'tasks.yml', 'run', '.sign'],
}

const zh: HomeContent = {
  heroSubtitle: 'YAML 流程 → Shell 脚本 → DAG 执行',
  heroBody:
    'annopi 的 TypeScript 重写版 — 生信流程编排引擎。将 pipeline.yml 与 project.yml 展开为 shell 脚本和 tasks.yml，本地通过 ata 执行，集群通过 annotask 投递。',
  ctaStart: '开始使用',
  ctaInstall: '安装指南',
  whyTitle: '为什么需要 annopi-ts',
  whyIntro: '生信流程需要可复现的编排，而不是每个项目重写一套胶水脚本。',
  problemsTitle: '常见痛点',
  solutionsTitle: 'annopi-ts 如何解决',
  featuresTitle: '功能特性',
  seeActionTitle: '工作流程',
  previewPipeline: 'pipeline.yml + project.yml',
  previewTasks: '生成的 tasks.yml',
  previewRunners: '执行器路径（ata / annotask）',
  previewDeps: 'pipeline 全局 deps',
  architectureTitle: '架构',
  architectureIntro:
    'annopi-ts 将纯逻辑（core）与 I/O 运行时（node）分离，通过 CLI 暴露 conf / run / install。',
  installTitle: '安装步骤',
  quickStartTitle: '快速启动命令',
  problems: [
    {
      icon: '📝',
      title: '临时 Shell 脚本',
      desc: '每个项目都要重写样本循环、依赖排序和断点续跑逻辑，脆弱且难维护。',
    },
    {
      icon: '🔀',
      title: '本地与集群不一致',
      desc: '同一任务在本地和 SGE 上需要不同包装命令，容易不同步。',
    },
    {
      icon: '🐍',
      title: '仅 Python 运行时',
      desc: '原版 annopi 功能完善，但 TypeScript 引擎更便于与 Node 生态和 annovibe 集成。',
    },
  ],
  solutions: [
    {
      icon: '📋',
      title: '声明式 YAML',
      desc: '一次定义任务、参数、依赖和资源。annopi conf 按样本展开并写入 shell/*.sh。',
    },
    {
      icon: '⚙️',
      title: '统一执行器',
      desc: 'local 模式用 ata 或 annotask 的 -i/-l/-t（不加 local 子命令）；qsubsge 模式用 annotask qsubsge。',
    },
    {
      icon: '🔄',
      title: 'Python ↔ TS 互操作',
      desc: 'Python annopi 与 annopi-ts 可读取相同配置，并执行对方生成的 tasks.yml。',
    },
  ],
  features: en.features.map((f, i) => ({
    ...f,
    title: ['ParamResolver', 'Task Modules', 'Script Generation', '.sign Checkpoints', 'CLI', 'Report (planned)'][i] === 'ParamResolver' ? 'ParamResolver' :
      ['参数展开', '任务模块', '脚本生成', '.sign 断点', 'CLI', '报告（规划中）'][i],
    desc: [
      '支持 single、sample、cmp 参数模式，含交叉引用与 optional 块。',
      '通过 imports、path 或 inline 加载任务，合并 pipeline 与模块 deps。',
      '生成 annotask 兼容的 shell/*.sh 和带 runcmd 的 tasks.yml。',
      '通过 .sign 文件断点续跑 — run 自动跳过已完成任务。',
      'annopi conf、annopi run、annopi install — V1 与 Python 版命令面对齐。',
      '报告渲染不在 V1 范围；设计方案使用 ../rst 而非 Jinja2 + Sphinx。',
    ][i],
  })),
  installSteps: [
    {
      step: '01',
      title: '前置条件',
      desc: 'Node.js ≥ 18、pnpm，本地执行需安装 ata。qsubsge 模式需 annotask。',
    },
    {
      step: '02',
      title: '克隆与安装',
      code: 'git clone https://github.com/seqyuan/annopi-ts.git\ncd annopi-ts\npnpm install\npnpm build',
    },
    {
      step: '03',
      title: '配置流程',
      code: 'node packages/cli/dist/cli.js conf \\\n  -p tests/fixtures/annopi/pipeline.yml \\\n  -c tests/fixtures/annopi/project.yml \\\n  -o /tmp/annopi-out',
    },
    {
      step: '04',
      title: '运行任务',
      code: 'node packages/cli/dist/cli.js run -o /tmp/annopi-out',
      note: '完成的任务在 shell/ 下生成 .sign 文件。重新 run 会从 pending 任务继续。',
    },
  ],
  workflowLabels: ['pipeline.yml', 'conf', 'shell/*.sh', 'tasks.yml', 'run', '.sign'],
}

const content: Record<Locale, HomeContent> = { en, zh }

export function getHomeContent(locale: string): HomeContent {
  return content[locale as Locale] ?? content.en
}

export const quickStartCode = `# Clone and build
git clone https://github.com/seqyuan/annopi-ts.git
cd annopi-ts
pnpm install
pnpm build

# Generate scripts and tasks.yml
node packages/cli/dist/cli.js conf \\
  -p tests/fixtures/annopi/pipeline.yml \\
  -c tests/fixtures/annopi/project.yml \\
  -o /tmp/annopi-out

# Execute pipeline (resume via .sign files)
node packages/cli/dist/cli.js run -o /tmp/annopi-out

# Optional: set global runner paths in pipeline.yml
# deps:
#   ata: /path/to/ata
#   annotask: /path/to/annotask`
