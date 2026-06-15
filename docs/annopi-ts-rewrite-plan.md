# annopi → annopi-ts 重写方案

> 将 Python 版 annopi（~1500 行）完整重写为 TypeScript/JavaScript，统一技术栈，
> 为 annovibe pipeline 扩展模块和 annox 多租户平台提供底层流程编排能力。

## 一、动机与目标

### 1.1 为什么要重写

| 维度 | 现状 | 目标 |
|------|------|------|
| **语言统一** | annopi (Python) + rst (TS) + annovibe (TS) + anno_worker (Go) 四种语言 | annopi-ts (TS) + rst (TS) + annovibe (TS) + anno_worker (Go)，业务层统一为 TS |
| **集成路径** | Python CLI 无法直接嵌入 annovibe/annox 的 Node.js 服务端 | annopi-ts 作为 npm 包，可被 annovibe extension、annox API 直接 import |
| **pipeline 扩展** | annovibe 的 pipeline 扩展（参考 oh-my-pi swarm）需要一个纯 TS 的流程引擎 | annopi-ts 的 core 包提供 DAG builder + param resolver，可直接复用 |
| **annox 集成** | annox 需要通过 anno_worker 在远程执行 `annopi conf/run`，需要 Python 环境 | annopi-ts CLI 编译为单文件，或直接作为 worker 的内置模块 |
| **维护成本** | Python 和 JS 双语言技能要求 | 统一 TS 技术栈，降低团队维护心智负担 |

### 1.2 不改动什么

- **annotask**（Go 二进制）：继续作为并行任务执行引擎，annopi-ts 只负责生成 annotask 兼容的脚本格式
- **anno_worker**（Go）：继续独立演进，annopi-ts 仅通过 CLI 调用与之协作
- **annovibe Web UI**：不涉及改动，annopi-ts 作为后端/CLI 能力提供

---

## 二、现状分析

### 2.1 annopi Python 代码结构（~1500 行）

```
annopi/
├── cli/                    # Click CLI (336 行)
│   ├── main.py            # 入口：conf / run / install / report 命令
│   ├── conf.py            # annopi conf 命令实现 (127 行)
│   ├── run_cmd.py         # annopi run 命令实现 (77 行)
│   └── report_cmd.py      # annopi report 命令实现 (90 行)
├── config/                # 配置解析 (305 行)
│   ├── pipeline_parser.py # 解析 pipeline.yml → PipelineConfig (45 行)
│   ├── project_parser.py  # 解析 project.yml → ProjectConfig (40 行)
│   ├── task_loader.py     # 加载 task.yml，合并 deps 优先级 (96 行)
│   └── validator.py       # 校验配置完整性 (124 行)
├── generator/             # 脚本生成 (391 行)
│   ├── param_resolver.py  # 核心参数解析引擎 (274 行)
│   │   ├── Layer 0: ${sample.xxx}、${sample.field? content} 可选块
│   │   ├── Layer 1: group_by + ${sample[field=value].xxx} 交叉引用
│   │   ├── Layer 2: ${cmp.xxx}、${cmp.case_samples.xxx} 比较组
│   │   ├── ${config.Para.xxx} 全局参数
│   │   └── ${deps.xxx} 软件路径
│   ├── script_generator.py # 生成 .sh 文件 (12 行)
│   └── tasks_yml_generator.py # 生成 tasks.yml 状态文件 (105 行)
├── executor/              # DAG 调度 (69 行)
│   └── dag_builder.py     # 拓扑排序 + 层级计算
├── state/                 # 状态管理 (114 行)
│   └── tasks_state.py     # tasks.yml 读写 + .sign 断点续跑
├── modules/               # 模块管理 (130 行)
│   ├── installer.py       # Git 下载 task 模块
│   ├── namespace_resolver.py # 命名空间解析
│   └── version_manager.py # 版本管理
├── report/                # 报告生成 (160 行)
│   └── template_renderer.py # Jinja2 模板渲染
└── utils/
```

### 2.2 rst 项目结构（参考模式）

```
rst/
├── packages/
│   ├── core/           # @seqyuan/rst-renderer — 核心库
│   │   ├── src/
│   │   │   ├── ast/        # AST 类型 + 访问者
│   │   │   ├── parser/     # RST 解析器
│   │   │   ├── renderer/   # HTML / React / Markdown 渲染器
│   │   │   ├── plugins/    # 指令插件
│   │   │   └── templates/  # 模板系统
│   │   └── tests/
│   ├── cli/            # @seqyuan/rst-cli — CLI 工具
│   │   └── src/
│   └── vite-plugin/    # @seqyuan/vite-plugin-rst
├── web/                # Next.js Web 应用（使用 rst 包）
├── pnpm-workspace.yaml
└── package.json
```

**关键模式**：pnpm workspace monorepo、core/cli 分离、tsup 构建、vitest 测试。

### 2.3 annovibe pipeline 扩展背景

annovibe 的 roadmap（`annovibe/docs/roadmap-omp-extensions.md`）规划了从 oh-my-pi 移植的 Swarm Extension：

- YAML 定义 DAG，支持 pipeline / parallel / sequential 三种模式
- 拓扑排序 wave 执行
- 状态持久化到 `.swarm_<name>/`
- UI 面板展示 pipeline 进度

annopi-ts 的 DAG builder 和 state 管理可以直接成为 Swarm Extension 的底层引擎。

### 2.4 annox pipeline 设计对齐

annox（`annox/docs/product-architecture.md`）将 `# pipeline` 作为核心交互：

- Pipeline 来源：组织级、项目级（`workdir://.annox/pipelines/`）、用户草稿
- 底层执行：`annopi conf -p pipeline.yml -c project.yml -o ./output` + `annopi run ...`
- annox 负责管理 pipeline 模板、让 agent 辅助生成 project.yml、通过 anno_worker 远程执行

annopi-ts 必须保持 YAML 格式与 Python 版兼容，并支持 headless API 调用。

### 2.5 anno_worker 执行模型

anno_worker（`anno_worker/doc/architecture.md`）定义了：

- Worker 通过 WebSocket 接收 tool 调用，在 Linux 服务器本地执行
- 支持 bash / read / write / ls / edit 等工具
- Worker 本身不包含 agent 逻辑，只执行副作用

annopi-ts 的 CLI 将作为 anno_worker 的 `bash` tool 调用的 payload 执行。

---

## 三、annopi-ts 架构设计

### 3.1 整体 package 结构

```
annopi-ts/
├── packages/
│   ├── core/               # @seqyuan/annopi-core — 核心库（零依赖）
│   │   ├── src/
│   │   │   ├── index.ts           # 统一导出
│   │   │   ├── config/
│   │   │   │   ├── types.ts       # 所有 TypeScript 类型定义
│   │   │   │   ├── pipeline.ts    # pipeline.yml 解析
│   │   │   │   ├── project.ts     # project.yml 解析
│   │   │   │   ├── task.ts        # task.yml 加载 + deps 合并
│   │   │   │   └── validator.ts   # 配置校验
│   │   │   ├── resolver/
│   │   │   │   ├── index.ts       # 主入口
│   │   │   │   ├── param-resolver.ts  # 核心参数解析（最复杂模块）
│   │   │   │   └── patterns.ts    # 正则模式定义
│   │   │   ├── dag/
│   │   │   │   └── builder.ts     # DAG 拓扑排序 + 层级计算
│   │   │   ├── generator/
│   │   │   │   ├── script.ts      # 生成 .sh 脚本
│   │   │   │   └── tasks-yml.ts   # 生成 tasks.yml
│   │   │   ├── state/
│   │   │   │   └── tasks-state.ts # 状态管理 + .sign 断点续跑
│   │   │   ├── modules/
│   │   │   │   ├── installer.ts   # Git 模块安装
│   │   │   │   ├── resolver.ts    # 命名空间解析
│   │   │   │   └── version.ts     # 版本管理
│   │   │   └── report/
│   │   │       └── renderer.ts    # 报告模板渲染（Jinja2 → 用 @seqyuan/rst-renderer 的模板系统替代）
│   │   ├── tests/
│   │   │   ├── config/
│   │   │   ├── resolver/
│   │   │   ├── dag/
│   │   │   ├── state/
│   │   │   └── fixtures/          # 测试用 YAML 文件
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── cli/                # @seqyuan/annopi-cli — CLI 工具
│   │   ├── src/
│   │   │   ├── cli.ts            # CLI 入口 (commander/yargs)
│   │   │   ├── commands/
│   │   │   │   ├── conf.ts       # annopi conf 命令
│   │   │   │   ├── run.ts        # annopi run 命令（读取 tasks.yml runcmd + child_process 并发执行）
│   │   │   │   ├── install.ts    # annopi install 命令（支持 --update 更新到最新版本）
│   │   │   │   └── report.ts     # annopi report 命令（--data 允许多次使用、--scan glob、--var key=value）
│   │   │   └── context.ts        # 全局上下文（参考 rst-cli）
│   │   ├── package.json
│   │   └── tsup.config.ts
│   │
│   └── extension/          # @seqyuan/annopi-extension — pi 扩展（annovibe 集成）
│       ├── src/
│       │   └── index.ts          # registerAnnoPiExtension(pi)
│       └── package.json
│
├── docs/
│   ├── annopi-ts-rewrite-plan.md  # 本文件
│   ├── api.md                     # API 文档
│   └── migration.md               # Python → TS 迁移指南
│
├── pnpm-workspace.yaml
├── package.json            # 根 package.json
├── tsconfig.base.json
├── vitest.config.ts        # 根 vitest 配置
└── README.md
```

### 3.2 核心模块设计

#### 类型系统（config/types.ts）

所有 YAML 结构转换为带严格类型的 TypeScript interface：

```typescript
// ========== project.yml ==========

export interface ProjectSample {
  sample_name: string;
  [key: string]: unknown;     // 自由扩展字段
}

export interface ProjectComparison {
  name: string;
  case: string | string[];
  control: string | string[];
  by?: string;
}

export interface ProjectConfig {
  version: string;
  product?: string;
  sample: ProjectSample[];
  cmp?: ProjectComparison[];
  Para?: Record<string, string>;
  Combine?: string[];
  raw: Record<string, unknown>;   // 保留原始数据
}

// ========== pipeline.yml ==========

export interface TaskDeps {
  name: string;
  default: string;
}

export interface TaskInterfaceIO {
  name: string;
  type: 'directory' | 'file';
  description: string;
  required_files?: string[];
  provides?: string[];
}

export interface TaskResources {
  cpu?: number;
  mem?: number;
  queue?: string;
  executor?: 'qsubsge' | 'local';
  mode?: string;
}

export interface TaskAnnotask {
  lines: number;
  threads: number;
  project?: string;
}

export interface TaskDef {
  name: string;
  version?: string;
  description?: string;
  deps?: TaskDeps[];
  interface?: {
    inputs: TaskInterfaceIO[];
    outputs: TaskInterfaceIO[];
  };
  params?: Record<string, string>;
  command?: string;
  resources?: TaskResources;
  annotask?: TaskAnnotask;
  depends?: string[];             // 内联依赖声明
}

export interface PipelineConfig {
  name: string;
  version: string;
  imports?: string[];
  deps?: Record<string, string>;  // deps 覆盖
  tasks: Record<string, Partial<TaskDef> & {
    path?: string;                // 引用本地路径
    group_by?: string;            // Layer 1 分组字段
  }>;
  dependencies?: Record<string, string[]>;
}

// ========== 解析后的任务 ==========

export interface ResolvedTask {
  name: string;
  numberedName: string;          // e.g. "2-0-qc"
  level: number;
  index: number;
  deps: Record<string, string>;  // 合并后的 deps（task default → pipeline 覆盖）
  params: Record<string, string>;
  command: string;
  resources: TaskResources;
  annotask: TaskAnnotask;
  depends: string[];
  group_by?: string;
  commands: string[];            // 生成的多行命令
}

// ========== tasks.yml ==========

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TaskState {
  status: TaskStatus;
  depends: string[];
  start_time?: string;
  end_time?: string;
}

export interface TasksFile {
  tasks: Record<string, TaskState>;
}
```

#### 参数解析器（resolver/param-resolver.ts）

这是最核心的模块（Python 版 274 行），需要精确复刻三种模式：

- **Layer 0**：`${sample.xxx}` — 每个样本一行命令
  - `${sample.field? content}` — 可选字段块
- **Layer 1**：`group_by` + `${sample[field=value].xxx}` — 同组内交叉引用
- **Layer 2**：`${cmp.xxx}` — 比较组模式
  - `${cmp.case_samples.xxx}` / `${cmp.control_samples.xxx}` — 样本列表拼接
- **全局**：`${config.Para.xxx}` / `${deps.xxx}` — 配置引用

设计为纯函数，无副作用：

```typescript
export class ParamResolver {
  constructor(
    private readonly project: ProjectConfig,
    private readonly deps: Record<string, string> = {}
  ) {}

  /** 检测模式：single | sample | cmp */
  detectMode(params: Record<string, string>, command?: string): 'single' | 'sample' | 'cmp';

  /** 展开参数，返回每个实例的解析后参数 */
  expand(
    params: Record<string, string>,
    groupBy?: string,
    command?: string
  ): ExpandedInstance[];

  /** 渲染最终命令字符串 */
  renderCommand(template: string, resolvedParams: Record<string, string>): string;
}

export interface ExpandedInstance {
  params: Record<string, string>;
  command: string;
  /** 如果是 sample 模式，关联的样本索引 */
  sampleIndex?: number;
  /** 如果是 cmp 模式，关联的比较组索引 */
  cmpIndex?: number;
}
```

**关键设计决策**：

1. 正则模式集中管理在 `patterns.ts` 中，便于测试和维护
2. 可选块解析使用手动状态机（非递归），处理嵌套 `${}` 场景
3. `${sample.field? content}` 中的 content 保留所有字符包括空格，因为它是命令片段

#### DAG Builder（dag/builder.ts）

Python 版 69 行的拓扑排序 + 层级计算，直接移植为 TypeScript：

```typescript
export class DAGBuilder {
  constructor(
    private readonly tasks: string[],
    private readonly dependencies: Record<string, string[]>
  ) {}

  /** 拓扑排序后的任务列表 */
  topologicalOrder(): string[];

  /** 获取任务层级 */
  getLevel(task: string): number;

  /** 获取编号名称 { "cellranger": "1-0-cellranger", "qc": "2-0-qc" } */
  getNumberedNames(): Record<string, string>;

  /** 获取某任务的直接依赖 */
  getDependencies(task: string): string[];
}
```

算法：入度表 + BFS 拓扑排序，O(N+E)。层级公式：`level[t] = max(level[dep]) + 1`。

#### 状态管理（state/tasks-state.ts）

Python 版 114 行的状态管理，精确复刻：

```typescript
export class TasksState {
  constructor(private readonly tasksPath: string) {}

  /** 读取 tasks.yml */
  load(): TasksFile;

  /** 更新任务状态，自动记录 start_time / end_time */
  updateStatus(numberedName: string, status: TaskStatus): Promise<void>;

  /** 检查 .sign 文件是否存在 */
  isSigned(numberedName: string, shellDir: string): boolean;

  /** 写入 .sign 文件 */
  writeSign(numberedName: string, shellDir: string): Promise<void>;

  /** 启动时根据 .sign 文件同步状态（.sign 是最终权威） */
  refreshFromSigns(shellDir: string): Promise<void>;

  /** 获取所有就绪任务（依赖全完成 + 自身 pending） */
  getReady(): string[];

  /** 查询方法 */
  isAllDone(): boolean;
  hasFailed(): boolean;
  hasRunning(): boolean;
}
```

**原子写入**：先写 `.tmp` 文件，再 rename（保证不损坏 tasks.yml）。

#### 脚本生成器（generator/script.ts）

生成 annotask 兼容的脚本文件：

```typescript
export class ScriptGenerator {
  constructor(private readonly shellDir: string) {}

  /**
   * 生成任务脚本
   * @returns 生成的 .sh 文件路径
   */
  generateTaskScript(numberedName: string, commands: string[]): string;

  /**
   * 注意：Python 版不在 .sh.run 文件中存储 annotask 命令。
   * annotask 包装命令通过 _build_runcmd() 存储在 tasks.yml 的 runcmd 字段中，
   * annopi run 读取 runcmd 并通过 subprocess 执行。
   *
   * TS 版保持相同行为：由 generator/tasks-yml.ts 的 _build_runcmd() 生成 runcmd。
   */
}
```

#### 报告渲染器（report/renderer.ts）

Python 版使用 Jinja2 模板渲染。TS 版使用 `@seqyuan/rst-renderer` 的模板系统替代，或使用简单的模板引擎（如 handlebars / 内建替换）：

```typescript
export class ReportRenderer {
  /**
   * 扫描目录，获取文件列表注入模板
   * 等价于: annopi report <template.rst.j2> <output.rst> --data <path> --scan <pattern>
   */
  render(templatePath: string, outputPath: string, options: ReportOptions): Promise<void>;
}

export interface ReportOptions {
  dataPath?: string;
  scanPattern?: string;
  context?: Record<string, unknown>;
}
```

#### 模块管理（modules/installer.ts）

去中心化模块安装，从 Git 仓库下载 task 模块：

```typescript
export class ModuleInstaller {
  /**
   * 安装模块
   * @param uri github.com/user/repo/taskname@v1.2.3 或本地路径
   */
  install(uri: string): Promise<InstallResult>;

  /** 列出已安装模块 */
  list(): Promise<InstalledModule[]>;

  /** 卸载模块 */
  uninstall(name: string, version?: string): Promise<void>;
}
```

存储位置：`~/.annopi/tasks/{namespace}/{version}/`（与 Python 版兼容）。

### 3.3 CLI 设计（@seqyuan/annopi-cli）

使用 `commander` 或 `yargs`，保持命令行接口与 Python 版完全一致：

```bash
# 生成脚本
annopi conf -p pipeline.yml -c project.yml -o ./output

# 执行流程
annopi run -p pipeline.yml -c project.yml -o ./output

# 安装模块
annopi install github.com/user/repo/taskname@v1.2.3

# 报告生成（如果需要，可以考虑由 @seqyuan/rst-cli 接管）
annopi report <template> <output> [--data <path>] [--scan <pattern>]
```

**cli.ts 结构**：

```typescript
import { Command } from 'commander';

const program = new Command('annopi');

program
  .command('conf')
  .option('-p, --pipeline <path>', 'pipeline.yml path')
  .option('-c, --config <path>', 'project.yml path')
  .option('-o, --output <dir>', 'output directory', './output')
  .action(confCommand);

program
  .command('run')
  .option('-p, --pipeline <path>', 'pipeline.yml path')
  .option('-c, --config <path>', 'project.yml path')
  .option('-o, --output <dir>', 'output directory', './output')
  .action(runCommand);

program
  .command('install <uri>')
  .option('-u, --update', 'Update to latest version')
  .action(installCommand);

program
  .command('report <template> <output>')
  .option('--data <path...>', 'data directories (can be specified multiple times)')
  .option('--scan <pattern>', 'scan pattern for existing reports')
  .option('--var <keyvalue...>', 'template variables (key=value format)')
  .action(reportCommand);

program.parse();
```

### 3.4 pi 扩展设计（@seqyuan/annopi-extension）

为 annovibe 提供 pi extension，将 annopi 的能力注册为 agent tool：

```typescript
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';
import { defineTool } from '@earendil-works/pi-coding-agent';
import { Type } from '@earendil-works/pi-ai';
import { AnnoPi } from '@seqyuan/annopi-core';

export function registerAnnoPiExtension(pi: ExtensionAPI) {
  // Tool 1: 生成 pipeline 配置
  pi.registerTool(defineTool({
    name: 'annopi_conf',
    label: 'Generate Pipeline Scripts',
    description: '解析 pipeline.yml + project.yml，生成执行脚本到 output 目录',
    parameters: Type.Object({
      pipelinePath: Type.String({ description: 'pipeline.yml 路径' }),
      projectPath: Type.String({ description: 'project.yml 路径' }),
      outputDir: Type.String({ description: '输出目录' }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx: ExtensionContext) {
      const annopi = new AnnoPi({
        pipelinePath: params.pipelinePath,
        projectPath: params.projectPath,
        outputDir: params.outputDir,
      });
      const result = await annopi.conf();
      return {
        content: [{ type: 'text', text: result.summary }],
        details: result,
      };
    },
  }));

  // Tool 2: 执行流程
  pi.registerTool(defineTool({
    name: 'annopi_run',
    label: 'Run Pipeline',
    description: '按 DAG 顺序执行已生成的流程脚本',
    parameters: Type.Object({
      outputDir: Type.String({ description: 'conf 步骤的输出目录' }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx: ExtensionContext) {
      // ...
    },
  }));

  // Tool 3: 校验配置
  pi.registerTool(defineTool({
    name: 'annopi_validate',
    label: 'Validate Pipeline Config',
    description: '校验 pipeline.yml 和 project.yml 的完整性和一致性',
    parameters: Type.Object({
      pipelinePath: Type.String(),
      projectPath: Type.String(),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx: ExtensionContext) {
      // ...
    },
  }));
}
```

### 3.5 AnnoPi 顶层 API

core 包对外暴露一个统一的 `AnnoPi` 类，封装完整的 `conf → run` 流水线：

```typescript
export interface AnnoPiOptions {
  pipelinePath: string;
  projectPath: string;
  outputDir?: string;          // 默认 ./output
  shellDir?: string;           // 默认 <outputDir>/shell
  processDir?: string;         // 默认 <outputDir>/process
  uploadDir?: string;          // 默认 <outputDir>/upload
}

export class AnnoPi {
  constructor(options: AnnoPiOptions);

  /** 步骤 1: 加载配置（解析 pipeline + project） */
  loadConfig(): Promise<ConfigResult>;

  /** 步骤 2: 校验配置 */
  validate(): Promise<ValidationResult>;

  /** 步骤 3: 解析任务（加载 task、合并 deps、解析参数、构建 DAG） */
  resolve(): Promise<ResolveResult>;

  /** 步骤 4: 生成脚本（.sh + .sh.run） */
  generate(): Promise<GenerateResult>;

  /** 完整 conf 步骤（loadConfig → validate → resolve → generate） */
  conf(): Promise<ConfResult>;

  /** 步骤 5: 执行流程（按 DAG 调度，支持断点续跑） */
  run(): Promise<RunResult>;

  /** 获取执行状态 */
  status(): Promise<TasksFile>;
}
```

---

## 四、技术栈

| 维度 | 选择 | 理由 |
|------|------|------|
| **包管理** | pnpm workspace | 与 rst 项目一致，monorepo 管理 |
| **语言** | TypeScript 5.7+ | strict mode，全类型覆盖 |
| **构建** | tsup | 快速、支持多入口、dts 生成 |
| **测试** | vitest | 与 rst 一致，快速、原生 ESM |
| **CLI** | commander | 轻量、TypeScript 友好 |
| **YAML 解析** | yaml (npm) | 最流行的 JS YAML 库，支持解析和序列化 |
| **文件操作** | fs-extra | 扩展 Node.js fs API |
| **模板渲染** | handlebars 或 @seqyuan/rst-renderer | 替代 Jinja2 |
| **日志** | pino 或 console | 结构化日志 |
| **代码规范** | biome (参考 oh-my-pi) | 统一格式化 + lint |

### 4.1 依赖最小化原则

**core 包应尽量零运行时依赖**。YAML 解析可以内置轻量实现，或使用 `yaml` 包（唯一的 runtime dep）。

- **report 模块**：为避免引入 handlebars 等模板依赖，Phase 4 先实现内建 `{{var}}` 替换（纯字符串替换，满足基本 Jinja2 兼容），后续可升级为完整模板引擎。
- **modules/installer.ts**：Git 操作使用 `child_process.execFile('git', [...])`，不引入 simple-git 等依赖。

CLI 包可以依赖 `commander`、`fs-extra` 等。

---

## 五、测试策略

### 5.1 测试覆盖目标

| 模块 | 测试行数（估） | 说明 |
|------|---------------|------|
| config/types.ts | ~50 | 类型正确性 |
| config/pipeline.ts | ~80 | YAML 解析、边界条件 |
| config/project.ts | ~80 | YAML 解析、cmp 兼容性 |
| config/task.ts | ~100 | deps 合并优先级、路径引用 |
| config/validator.ts | ~120 | 缺失字段、循环依赖检测 |
| resolver/param-resolver.ts | ~300 | **最复杂**，需覆盖所有引用模式 |
| resolver/patterns.ts | ~60 | 各正则模式验证 |
| dag/builder.ts | ~100 | 拓扑排序、环检测、层级计算 |
| generator/script.ts | ~80 | 脚本生成格式 |
| generator/tasks-yml.ts | ~80 | tasks.yml 结构 |
| state/tasks-state.ts | ~120 | 状态转换、sign 文件、原子写入 |
| modules/installer.ts | ~60 | Git 安装流程 |
| report/renderer.ts | ~80 | 模板渲染、数据注入 |

### 5.2 测试 fixtures

复用 Python 版的测试 YAML 文件，新增边界情况：

```
tests/fixtures/
├── pipeline/
│   ├── basic.yml
│   ├── with_imports.yml
│   ├── with_deps_override.yml
│   ├── with_group_by.yml
│   └── with_cycle.yml           # 应检测到环
├── project/
│   ├── basic.yml
│   ├── with_cmp.yml
│   ├── with_optional_fields.yml
│   └── with_cmp_direct_list.yml
└── expected/                     # 预期输出
    ├── commands.txt
    └── tasks.yml
```

### 5.3 端到端测试

```bash
# 完整流程测试
annopi conf -p tests/fixtures/pipeline/basic.yml \
            -c tests/fixtures/project/basic.yml \
            -o /tmp/test-output

# 验证生成文件
cat /tmp/test-output/shell/tasks.yml
ls /tmp/test-output/shell/*.sh
```

---

## 六、与 Python 版的兼容性

### 6.1 YAML 格式完全兼容

annopi-ts 必须能解析和生成与 Python 版完全一致格式的 YAML 文件。这意味着：

- `tasks.yml` 的输出格式一致
- `.sh` 脚本的命令行格式一致
- annotask 包装脚本格式一致

### 6.2 tasks.yml 互操作

annopi-ts 生成的 `tasks.yml` 可以被 Python 版 `annopi run` 读取，反之亦然。

### 6.3 .sign 文件机制不变

sign 文件命名、检查逻辑保持完全一致。

### 6.4 报告模板兼容

如果 Python 版的报告模板是 Jinja2，TS 版需要提供兼容的模板语法（handlebars 语法接近 Jinja2）。

---

## 七、实施路线

### Phase 1：核心类型 + 配置解析（~2 天）

```
Day 1-2:
├── packages/core/src/config/types.ts     # 所有 TS 类型
├── packages/core/src/config/pipeline.ts  # pipeline.yml → PipelineConfig
├── packages/core/src/config/project.ts   # project.yml → ProjectConfig
├── packages/core/src/config/task.ts      # task.yml 加载 + deps 合并
├── packages/core/src/config/validator.ts # 配置校验
└── vitest 测试
```

### Phase 2：参数解析引擎（~3.5 天）

```
Day 3-6.5:
├── packages/core/src/resolver/patterns.ts     # 正则模式
├── packages/core/src/resolver/param-resolver.ts  # 核心解析引擎
│   ├── detectMode
│   ├── expand (single / sample / cmp) — 内部使用 __annopi_command__ 传递命令模板
│   ├── resolveString (${config} / ${deps})
│   ├── resolveOptionalBlocks（手动状态机处理嵌套 ${}）
│   ├── resolveCrossRefs
│   ├── resolveCmpSamples
│   └── renderCommand（过滤 __annopi_ 前缀内部字段）
└── 350+ 行测试（覆盖所有引用模式 + 边界条件）
```

**这是最关键阶段**。param-resolver 是最复杂的模块（274 行 Python 但逻辑密集），需要精确复刻 Python 版行为。嵌套括号匹配的状态机、交叉引用解析、三种模式的展开路径是主要难点。

### Phase 3：DAG + 生成器（~2 天）

```
Day 6-7:
├── packages/core/src/dag/builder.ts        # 拓扑排序
├── packages/core/src/generator/script.ts   # .sh 生成
├── packages/core/src/generator/tasks-yml.ts # tasks.yml 生成（含 _build_runcmd）
├── packages/core/src/state/tasks-state.ts  # 状态管理
└── 测试
```

#### 任务加载优先级（config/task.ts）

Python 版 `TaskLoader.load_all()` 实现严格的 3 级加载优先级：

| 优先级 | 来源 | 行为 |
|--------|------|------|
| 1（最高） | pipeline.yml `tasks` 中没有 `path` 的内联定义 | 直接使用，覆盖一切 |
| 2 | pipeline.yml `tasks` 中有 `path` 的本地引用 | 从本地路径加载 task.yml，可被内联字段覆盖 |
| 3（最低） | pipeline.yml `imports` 声明的外部模块 | 从 `~/.annopi/tasks/` 加载，可被 `tasks` 覆盖 |

TS 版必须实现相同优先级逻辑。

#### tasks.yml 生成器（generator/tasks-yml.ts）

必须包含 `_build_runcmd()` 逻辑，为每个任务生成 annotask 执行命令字符串。
根据 `executor` 类型生成不同格式：

- **local 模式**：`annotask -i script.sh -l N -t M --project X`
- **qsubsge 模式**：`annotask qsubsge -i script.sh -l N -t M --project X --cpu C --mem M --queue Q --mode pe_smp [--h_vmem V] [--hostname H]`

`generate()` 方法参数：
```typescript
generate(
  pipelineName: string,
  tasksMeta: TaskMeta[],        // 每个任务的元数据
  shellDir: string              // shell 脚本目录（用于生成 runcmd 中的绝对路径）
): TasksFile
```

生成完整的 `tasks.yml` 包含 `pipeline`、`generated_at`、每个任务的 `runcmd`/`depends`/`status`。

### Phase 4：CLI + 模块管理（~2 天）

```
Day 8-9:
├── packages/cli/src/cli.ts              # commander CLI
├── packages/cli/src/commands/conf.ts
├── packages/cli/src/commands/run.ts
├── packages/cli/src/commands/install.ts
├── packages/cli/src/commands/report.ts
├── packages/core/src/modules/*          # 模块管理
├── packages/core/src/report/renderer.ts # 报告渲染
└── 端到端测试
```

### Phase 5：pi 扩展 + annovibe 集成（~2 天）

```
Day 10-11:
├── packages/extension/src/index.ts      # registerAnnoPiExtension
├── annovibe 集成测试
└── 文档完善
```

### Phase 6：文档 + 发布（~1 天）

```
Day 12:
├── README.md
├── docs/api.md
├── docs/migration.md
├── npm publish
└── 集成到 annox pipeline
```

**总计：~12 天**

---

## 八、关键设计决策

### 8.1 为什么要 monorepo 而非单包

1. **关注点分离**：core 零依赖 → 可嵌入 anno_worker，cli 可独立分发
2. **与 rst 一致**：团队已经熟悉 pnpm workspace 工作流
3. **annovibe 集成**：extension 包可以只依赖 core，不引入 CLI 依赖

### 8.2 为什么要重写而非移植

1. **类型安全**：Python dict → TypeScript strict interface，编译时检查
2. **API 设计**：Python 版是面向过程的 Click CLI，TS 版可以面向对象 + 函数式组合
3. **集成友好**：`import { AnnoPi } from '@seqyuan/annopi-core'` 比 `subprocess.run(['annopi', 'conf', ...])` 好得多
4. **测试**：vitest 比 pytest 更适合 TS 项目

### 8.3 报告系统的去留

Python 版 `annopi` 的报告系统使用 Jinja2 渲染 RST 模板。TS 版有两个选择：

- **选项 A**：保留简单的模板渲染，做 `annopi report` 命令
- **选项 B**：完全由 `@seqyuan/rst-renderer` + `@seqyuan/rst-cli` 接管，`annopi` 不再包含报告功能

**建议选项 A（保守）**：annopi-ts 提供轻量模板渲染，确保向后兼容。未来可以让 annovibe/annox 使用 rst-renderer 生成更丰富的报告。

### 8.4 `__annopi_command__` 内部机制

Python 版 `ParamResolver.expand()` 在 sample/cmp 模式时，将 command 模板以 `__annopi_command__` 为 key 插入参数字典，通过完整参数展开管线处理。在 `renderCommand()` 中按 `__annopi_` 前缀过滤掉内部 key，不对用户暴露。

TS 版应使用相同机制：在 `expand()` 的展开结果中存储命令模板，在 `renderCommand()` 中解析并移除内部字段。

### 8.5 `annopi run` 并行执行模型

Python 版使用 `ThreadPoolExecutor.submit(subprocess.run(runcmd, shell=True))` 执行任务。

TS 版建议：
- 使用基于 async/await 的任务队列 + `child_process.exec(runcmd)` + 并发限制器（`p-limit` 或自建信号量）
- 每个 DAG 层级内的任务并发执行，层级间串行
- 状态更新通过 `TasksState.updateStatus()` 写入 tasks.yml

### 8.6 与 oh-my-pi swarm 的关系

oh-my-pi 的 Swarm Extension 是 agent 级别的流水线编排（每个 stage 是一个 agent session），而 annopi 是命令行级别的流程编排（每个 stage 是一组 bash 命令）。两者互补：

- **annopi-ts**：底层流程引擎，解析 YAML → 生成脚本 → 执行
- **swarm-extension**：上层多 agent 编排，可以调用 annopi-ts 作为执行后端

annovibe 的 pipeline 扩展可以同时拥有两个层次：

```
用户 #pipeline
  │
  ├─ annopi YAML (pipeline.yml + project.yml)
  │   └─ annopi-ts core: 解析 → 生成脚本 → annotask 执行
  │
  └─ swarm YAML (swarm.yml)
      └─ swarm extension: DAG → agent sessions → 每个 agent 可调用 annopi-ts
```

---

## 九、风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| **param-resolver 行为偏差** | 中 | 高 | 参考 Python 版编写大量参数化测试，逐个场景验证 |
| **YAML 序列化格式差异** | 低 | 中 | 使用 `yaml` npm 包，配置 `lineWidth` 等参数匹配 Python 输出 |
| **annotask 兼容性** | 低 | 高 | annotask 接受纯文本 .sh 文件，格式简单，只需验证换行和路径格式 |
| **Jinja2 → handlebars 模板迁移** | 中 | 低 | 报告系统使用量不大，可以逐步迁移 |
| **.sign 文件原子性** | 低 | 中 | Node.js `fs.rename` 是原子的，与 Python `Path.replace` 一致 |

---

## 十、成功标准

1. ✅ 所有 Python 版测试用例在 TS 版通过
2. ✅ `annopi conf -p a.yml -c b.yml -o /tmp/test` 生成与 Python 版完全一致的 shell 脚本
3. ✅ annovibe 可以通过 `@seqyuan/annopi-extension` 调用 annopi 功能
4. ✅ annox 可以通过 anno_worker 执行 annopi-ts CLI（保持与 Python 版 tasks.yml 互操作）
5. ✅ TypeScript strict mode 无 any 类型（除必要的 YAML 解析边界）
6. ✅ 测试覆盖率 > 90%
7. ✅ Python 版 `annopi run` 可读取 TS 版生成的 tasks.yml（格式完全兼容）

---

## 十一、审阅修订记录

### 第 1 次审阅（reviewer subagent）

**Blocker 修复**：
1. ✅ `TaskState` 增加 `runcmd` 字段（`annopi run` 依赖）
2. ✅ `TasksFile` 增加 `pipeline` 和 `generated_at` 元数据
3. ✅ 移除 `.sh.run` 包装脚本概念，恢复 Python 版 `runcmd` 存储在 tasks.yml 的方案
4. ✅ 明确 `tasks-yml.ts` 的 `_build_runcmd()` 逻辑和 `generate()` 参数签名

**Fix 修复**：
5. ✅ 补充任务加载 3 级优先级文档
6. ✅ CLI `install` 增加 `--update` 选项
7. ✅ `TaskDef` 增加 `scripts` 字段
8. ✅ `ProjectConfig` 增加类型化 `combines: string[]`
9. ✅ 补充 `__annopi_command__` 内部机制说明
10. ✅ 补充 `annopi run` 并行执行模型
11. ✅ `TaskResources` 增加 `h_vmem` / `hostname`
12. ✅ CLI `report --data` 改为 variadic，增加 `--var` 选项
13. ✅ Phase 2 时间从 3 天调整为 3.5 天，总工期从 12 天调整为 ~13 天

---

## 十二、参考文档

| 文档 | 路径 | 说明 |
|------|------|------|
| annopi 设计文档 | `../annopi/AGENTS.md` | 完整的使用指南和模板 |
| annopi 架构 | `../annopi/CLAUDE.md` | 代码架构和约定 |
| annopi 实现总结 | `../annopi/IMPLEMENTATION_SUMMARY.md` | 报告系统简化设计 |
| annovibe 扩展 roadmap | `../annovibe/docs/roadmap-omp-extensions.md` | pipeline 扩展规划 |
| annox 产品架构 | `../annox/docs/product-architecture.md` | 多租户 + pipeline 设计 |
| anno_worker 架构 | `../anno_worker/doc/architecture.md` | worker 远程执行模型 |
| anno_worker 语言比较 | `../anno_worker/doc/language-comparison.md` | Go vs JS 选型分析 |
| oh-my-pi swarm | `/Volumes/process/tmp/oh-my-pi/packages/swarm-extension/` | swarm 参考实现 |
| rst 项目结构 | `../rst/` | pnpm monorepo 参考模式 |
