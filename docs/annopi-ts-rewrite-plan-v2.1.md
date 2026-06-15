# annopi → annopi-ts 重写方案 V2.1

> V2.1 是 V2 的执行化版本。
> 它不再讨论“是否这样做”，而是直接定义：目录怎么搭、文件怎么拆、接口怎么定、测试怎么写、按什么顺序开工。

## 一、文档目标

这份文档回答五个落地问题：

1. V1 到底要交付哪些 package
2. 每个 package 里要有哪些文件
3. 每个核心模块的输入输出是什么
4. 测试要如何覆盖 Python/TS 互操作
5. 实际开发顺序怎么排，做到哪一步算完成

本文件默认以 [annopi-ts-rewrite-plan-v2.md](/Volumes/data/github/seqyuan/annopi-ts/docs/annopi-ts-rewrite-plan-v2.md) 为上位设计。

---

## 二、V1 交付边界

### 2.1 必须交付

V1 必须完成：

1. `pipeline.yml` / `project.yml` 解析
2. task 模块加载与 deps merge
3. `ParamResolver`
4. DAG builder
5. `shell/*.sh` 生成
6. `<outdir>/tasks.yml` 生成
7. `.sign` 驱动的 `run`
8. `annopi conf`
9. `annopi run`
10. `annopi install`
11. Python/TS 双向互操作测试

### 2.2 明确不在 V1

V1 不做：

1. `annopi report`
2. Jinja2 模板兼容
3. report 模块规范迁移
4. HTML/RST 渲染链
5. annovibe UI 集成
6. registry / marketplace
7. 远程 worker 协议扩展

### 2.3 兼容目标

V1 的兼容目标只有两个：

1. 配置兼容：Python 和 TS 都能读取同一份 pipeline/project
2. 执行兼容：Python 和 TS 都能执行对方生成的 `tasks.yml`

不追求：

1. YAML 序列化逐字节一致
2. CLI 帮助文本完全一致
3. 日志文本完全一致

---

## 三、仓库结构

建议最终目录：

```text
annopi-ts/
├── docs/
│   ├── annopi-ts-rewrite-plan.md
│   ├── annopi-ts-rewrite-plan-v2.md
│   └── annopi-ts-rewrite-plan-v2.1.md
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── dag/
│   │   │   ├── model/
│   │   │   ├── resolver/
│   │   │   ├── validate/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── node/
│   │   ├── src/
│   │   │   ├── fs/
│   │   │   ├── generator/
│   │   │   ├── loader/
│   │   │   ├── modules/
│   │   │   ├── runtime/
│   │   │   ├── state/
│   │   │   ├── workflow/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   ├── format/
│   │   │   ├── types/
│   │   │   └── cli.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── extension/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── tests/
│   ├── fixtures/
│   ├── compatibility/
│   └── helpers/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── README.md
```

### 3.1 V1 可以先创建但暂不实现的目录

可以预先创建，但允许只放占位文件：

1. `packages/extension/`
2. `tests/compatibility/`
3. `tests/helpers/`

### 3.2 V1 不建议创建的目录

不要在 V1 提前创建：

1. `packages/report/`
2. `packages/web/`
3. `packages/templates/`

因为这些会误导作用域。

---

## 四、package 级职责拆分

### 4.1 `@seqyuan/annopi-core`

职责：

1. 数据模型
2. parser 级标准化
3. 纯函数 validator
4. param resolver
5. DAG builder

约束：

1. 不读磁盘
2. 不写磁盘
3. 不执行子进程
4. 不依赖 `child_process`
5. 不依赖 git

运行时依赖建议：

1. 无依赖或仅极少运行时依赖

### 4.2 `@seqyuan/annopi-node`

职责：

1. 文件 I/O
2. YAML 反序列化与序列化
3. task 模块加载
4. 脚本与 `tasks.yml` 生成
5. `.sign` 状态同步
6. 子进程执行
7. git 安装
8. 顶层 workflow 服务

### 4.3 `@seqyuan/annopi-cli`

职责：

1. 参数解析
2. 错误处理
3. 输出格式
4. 退出码管理

不负责：

1. 直接写业务逻辑
2. 直接实现解析器
3. 直接操作 `tasks.yml`

### 4.4 `@seqyuan/annopi-extension`

V1 只需要：

1. 定义 package
2. 预留从 `@seqyuan/annopi-node` 调用 workflow 的接口

V1 不要求完成 annovibe 集成测试。

---

## 五、`core` 文件级设计

### 5.1 文件清单

```text
packages/core/src/
├── config/
│   ├── pipeline.ts
│   └── project.ts
├── dag/
│   └── builder.ts
├── model/
│   ├── pipeline.ts
│   ├── project.ts
│   ├── task.ts
│   └── tasks-file.ts
├── resolver/
│   ├── param-resolver.ts
│   └── patterns.ts
├── validate/
│   └── validator.ts
└── index.ts
```

### 5.2 `model/project.ts`

建议导出：

```ts
export interface ProjectConfig {
  raw: Record<string, unknown>;
  samples: Array<Record<string, unknown>>;
  comparisons: Array<Record<string, unknown>>;
  params: Record<string, unknown>;
  combines: string[];
}
```

### 5.3 `model/pipeline.ts`

建议导出：

```ts
export interface PipelineTaskDef {
  path?: string;
  group_by?: string;
  command?: string;
  params?: Record<string, string>;
  resources?: Record<string, unknown>;
  annotask?: Record<string, unknown>;
  depends?: string[];
  scripts?: string[];
  [key: string]: unknown;
}

export interface PipelineConfig {
  name: string;
  version: string;
  imports: string[];
  tasks: Record<string, PipelineTaskDef>;
  dependencies: Record<string, string[]>;
  deps: Record<string, string>;
}
```

### 5.4 `model/tasks-file.ts`

建议导出：

```ts
export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface TaskRuntimeState {
  runcmd: string;
  depends: string[];
  status: TaskStatus;
  start_time?: string;
  end_time?: string;
}

export interface TasksFile {
  pipeline: string;
  generated_at: string;
  tasks: Record<string, TaskRuntimeState>;
}
```

### 5.5 `config/project.ts`

职责：

1. 从原始 YAML object 构造 `ProjectConfig`
2. 兼容 `cmp` 的两种结构
3. 归一化 `Para` / `Combine`

建议接口：

```ts
export function parseProjectConfig(raw: Record<string, unknown>): ProjectConfig;
```

### 5.6 `config/pipeline.ts`

职责：

1. 从原始 YAML object 构造 `PipelineConfig`
2. 补默认空结构

建议接口：

```ts
export function parsePipelineConfig(raw: Record<string, unknown>): PipelineConfig;
```

### 5.7 `validate/validator.ts`

建议不是做一个巨型类，而是暴露一组函数和一个汇总结果：

```ts
export interface ValidationIssue {
  level: "error" | "warning" | "check";
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  hasErrors: boolean;
}

export function validateTaskFormat(
  taskName: string,
  taskDef: Record<string, unknown>,
): ValidationIssue[];

export function validateDepsDeclared(
  command: string,
  params: Record<string, string>,
  deps: Record<string, string>,
): ValidationIssue[];

export function validateConfigRefs(
  command: string,
  params: Record<string, string>,
  projectRaw: Record<string, unknown>,
): ValidationIssue[];

export function validateSampleRefs(
  command: string,
  params: Record<string, string>,
  samples: Array<Record<string, unknown>>,
): ValidationIssue[];
```

### 5.8 `resolver/patterns.ts`

集中维护：

1. 通用 `${...}` pattern
2. optional block pattern
3. cross-ref pattern
4. cmp samples pattern

不要在多个文件里重复写 regex。

### 5.9 `resolver/param-resolver.ts`

建议保留类，原因：

1. Python 版已有明确行为参照
2. 内部需要共享 `samples` / `comparisons` / `deps`
3. 可保持方法拆分清晰

建议对外接口：

```ts
export class ParamResolver {
  constructor(
    projectRaw: Record<string, unknown>,
    deps?: Record<string, string>,
  );

  resolveString(input: string): string;

  detectMode(
    params: Record<string, string>,
    command?: string,
  ): "single" | "sample" | "cmp";

  expand(
    params: Record<string, string>,
    options?: {
      groupBy?: string;
      command?: string;
    },
  ): Array<Record<string, string>>;

  renderCommand(
    command: string,
    resolvedParams: Record<string, string>,
  ): string;
}
```

内部私有方法建议拆成：

1. `_lookupConfig()`
2. `_resolveOptionalBlocks()`
3. `_resolveCrossRefs()`
4. `_resolveCmpSamples()`
5. `_findCmpSamples()`
6. `_groupSamples()`
7. `_getGroupValue()`

### 5.10 `dag/builder.ts`

建议接口：

```ts
export class DAGBuilder {
  constructor(
    tasks: string[],
    dependencies: Record<string, string[]>,
  );

  topologicalOrder(): string[];
  getLevel(task: string): number;
  getDependencies(task: string): string[];
  getNumberedNames(): Record<string, string>;
}
```

实现要求：

1. 检测环
2. 编号稳定
3. `level` 与 Python 版概念一致

---

## 六、`node` 文件级设计

### 6.1 文件清单

```text
packages/node/src/
├── fs/
│   ├── paths.ts
│   └── yaml.ts
├── generator/
│   ├── script-generator.ts
│   └── tasks-yml-generator.ts
├── loader/
│   └── task-loader.ts
├── modules/
│   ├── installer.ts
│   └── namespace-resolver.ts
├── runtime/
│   ├── run-pipeline.ts
│   └── run-task.ts
├── state/
│   └── tasks-state.ts
├── workflow/
│   └── annopi-workflow.ts
└── index.ts
```

### 6.2 `fs/paths.ts`

统一处理：

1. `outdir`
2. `shellDir`
3. `tasksPath`

建议接口：

```ts
export interface OutputPaths {
  outdir: string;
  shellDir: string;
  tasksPath: string;
}

export function resolveOutputPaths(outdir: string): OutputPaths;
```

说明：

1. V1 不强制创建 `process/` / `upload/`
2. 这些目录属于具体 pipeline/task 自己管理的工作目录约定

### 6.3 `fs/yaml.ts`

建议统一封装：

```ts
export async function readYamlFile<T>(path: string): Promise<T>;
export async function writeYamlFile(path: string, data: unknown): Promise<void>;
```

要求：

1. `sortKeys: false`
2. 输出风格尽量接近 Python
3. 所有 YAML 读写都走这层

### 6.4 `modules/namespace-resolver.ts`

建议接口：

```ts
export interface ModuleRef {
  host: string;
  path: string;
  version: string;
  isLocal: boolean;
  localPath: string;
}

export class NamespaceResolver {
  static readonly DEFAULT_BASE: string;

  constructor(baseDir?: string);

  parse(source: string): ModuleRef;
  getInstallDir(ref: ModuleRef): string;
}
```

### 6.5 `loader/task-loader.ts`

建议接口：

```ts
export class TaskLoader {
  constructor(options: {
    inlineTasks?: Record<string, Record<string, unknown>>;
    imports?: string[];
    projectTasksDir?: string;
    globalModulesDir?: string;
  });

  loadAll(): Promise<Record<string, Record<string, unknown>>>;

  collectDeps(
    pipelineDeps: Record<string, string>,
  ): Promise<{
    mergedDeps: Record<string, string>;
    sourceMap: Record<string, string>;
  }>;
}
```

要求：

1. 完全保持 Python 的三级优先级
2. 局部相对路径相对 `project.yml` 所在目录解析
3. 加载失败时错误信息带 task name 和 path

### 6.6 `generator/script-generator.ts`

建议接口：

```ts
export class ScriptGenerator {
  constructor(shellDir: string);

  generateTaskScript(
    numberedName: string,
    commands: string[],
  ): Promise<string>;
}
```

要求：

1. 创建 `shell/`
2. 始终以换行结尾
3. 不生成 `.run`
4. 不生成 `.report`

### 6.7 `generator/tasks-yml-generator.ts`

建议接口：

```ts
export interface TaskMeta {
  numberedName: string;
  resources: Record<string, unknown>;
  annotaskOptions: Record<string, unknown>;
  depends: string[];
}

export class TasksYmlGenerator {
  constructor(options?: {
    localRunner?: string;
  });

  generate(
    pipelineName: string,
    tasksMeta: TaskMeta[],
    shellDir: string,
    outdir: string,
  ): Promise<string>;
}
```

内部私有方法建议：

1. `_resolveLocalRunner()`
2. `_countLines()`
3. `_buildRunCmd()`

兼容要点：

1. qsubsge 模式保留 `annotask qsubsge`
2. local 模式保留 `ata`
3. `tasks.yml` 写到 `<outdir>/tasks.yml`

### 6.8 `state/tasks-state.ts`

建议接口：

```ts
export class TasksState {
  constructor(tasksPath: string);

  load(): Promise<TasksFile>;
  getTasks(): Promise<Record<string, TaskRuntimeState>>;
  updateStatus(name: string, status: TaskStatus): Promise<void>;
  isSigned(name: string, shellDir: string): Promise<boolean>;
  writeSign(name: string, shellDir: string): Promise<void>;
  refreshFromSigns(shellDir: string): Promise<void>;
  getReady(): Promise<string[]>;
  isAllDone(): Promise<boolean>;
  hasFailed(): Promise<boolean>;
  hasRunning(): Promise<boolean>;
}
```

实现要求：

1. 内部加锁
2. `.tmp` + rename 原子写
3. 多次 `load()` 结果一致

### 6.9 `runtime/run-task.ts`

建议只做单任务执行：

```ts
export async function runTask(options: {
  numberedName: string;
  runcmd: string;
  state: TasksState;
  shellDir: string;
}): Promise<"done" | "failed">;
```

职责：

1. 标记 `running`
2. 执行 shell command
3. 成功则写 `.sign`
4. 更新最终状态

### 6.10 `runtime/run-pipeline.ts`

建议做调度主循环：

```ts
export interface RunPipelineResult {
  completed: string[];
  failed: string[];
}

export async function runPipeline(options: {
  outdir: string;
}): Promise<RunPipelineResult>;
```

要求：

1. 读取 `<outdir>/tasks.yml`
2. 启动先 `refreshFromSigns()`
3. 基于 ready 队列持续调度
4. 不能做 level barrier 执行
5. 任一任务失败后，不再发射依赖它的下游
6. 等待当前 running 任务收敛后退出

### 6.11 `workflow/annopi-workflow.ts`

建议作为 `node` 层编排入口：

```ts
export class AnnopiWorkflow {
  constructor(options: {
    pipelinePath: string;
    projectPath: string;
    outdir: string;
  });

  conf(): Promise<{
    pipelineName: string;
    outdir: string;
    shellDir: string;
    tasksPath: string;
    taskCount: number;
  }>;

  run(): Promise<RunPipelineResult>;
}
```

它负责把：

1. YAML 读取
2. `core` parser
3. task loader
4. validator
5. param resolver
6. script generator
7. `tasks.yml` generator

串起来。

### 6.12 `modules/installer.ts`

建议接口：

```ts
export class Installer {
  constructor(namespaceResolver?: NamespaceResolver);

  install(source: string, update?: boolean): Promise<void>;
}
```

V1 保持 Python 版行为即可：

1. 支持 git clone
2. 支持 `@version`
3. 支持本地路径
4. 支持 `latest` symlink

---

## 七、`cli` 文件级设计

### 7.1 文件清单

```text
packages/cli/src/
├── commands/
│   ├── conf.ts
│   ├── install.ts
│   └── run.ts
├── format/
│   └── errors.ts
├── types/
│   └── options.ts
└── cli.ts
```

### 7.2 `cli.ts`

建议统一入口：

```ts
import { Command } from "commander";
```

只注册三个命令：

1. `conf`
2. `run`
3. `install`

### 7.3 `commands/conf.ts`

职责：

1. 解析参数
2. 调 `AnnopiWorkflow.conf()`
3. 打印摘要
4. 返回非零退出码

### 7.4 `commands/run.ts`

职责：

1. 只接收 `-o, --outdir`
2. 调 `runPipeline({ outdir })`
3. 失败时返回 `1`

### 7.5 `commands/install.ts`

职责：

1. 解析 `source`
2. 支持 `--update`
3. 调 `Installer.install()`

### 7.6 错误输出原则

CLI 错误建议分两类：

1. 用户配置错误
2. 运行时执行错误

不要在 CLI 层吞掉栈信息；开发模式可保留原始错误。

---

## 八、根配置文件建议

### 8.1 根 `package.json`

至少包括：

1. `private: true`
2. `packageManager: pnpm@...`
3. `scripts`

建议 scripts：

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "pnpm -r typecheck"
  }
}
```

### 8.2 `pnpm-workspace.yaml`

```yaml
packages:
  - packages/*
```

### 8.3 `tsconfig.base.json`

建议：

1. `strict: true`
2. `noUncheckedIndexedAccess: true`
3. `exactOptionalPropertyTypes: true`
4. `moduleResolution: bundler`
5. `module: ESNext`
6. `target: ES2022`

### 8.4 `vitest.config.ts`

建议支持：

1. monorepo 测试
2. node environment
3. 未来兼容测试目录

---

## 九、测试设计

### 9.1 单元测试分布

建议：

```text
packages/core/tests/
├── config/
├── dag/
├── resolver/
└── validate/

packages/node/tests/
├── generator/
├── loader/
├── runtime/
├── state/
└── workflow/
```

### 9.2 `ParamResolver` 最小测试矩阵

至少覆盖：

1. 纯 `${config.xxx}`
2. 纯 `${deps.xxx}`
3. `sample` 模式单字段替换
4. `sample` 模式 optional block
5. `sample` 模式 nested `${}` optional block
6. `group_by` + cross-ref 成功
7. `group_by` + cross-ref 失败跳过
8. `cmp` 直列表结构
9. `cmp.group` 旧结构
10. `cmp.case_samples.xxx`
11. `cmp.control_samples.xxx`
12. `sample` / `cmp` 混用报错

### 9.3 `tasks-yml-generator` 测试矩阵

至少覆盖：

1. local runner 默认 `ata`
2. local runner 覆盖为 deps 中的 `ata` 路径
3. local 模式 `lines` 自动提升
4. qsubsge 带 `cpu`
5. qsubsge 带 `mem`
6. qsubsge 带 `h_vmem`
7. qsubsge 带 `queue`
8. qsubsge 带 `mode`
9. qsubsge 带 `hostname`
10. qsubsge 带 `project`

### 9.4 `tasks-state` 测试矩阵

至少覆盖：

1. 初始 `getReady()`
2. 依赖完成后的 `getReady()`
3. failed 依赖不进入 ready
4. `.sign` 不存在
5. `.sign` 存在
6. `writeSign()`
7. `refreshFromSigns()` 将 done 校正
8. `refreshFromSigns()` 将 running 重置为 pending
9. `refreshFromSigns()` 将 failed 重置为 pending
10. `updateStatus()` 写入时间戳

### 9.5 `run-pipeline` 测试矩阵

至少覆盖：

1. `tasks.yml` 缺失时报错
2. 所有任务已 done 时直接退出
3. 单任务成功
4. 多任务依赖成功链
5. 中间任务失败后停止扩散
6. 启动时存在 `.sign` 自动跳过
7. ready 队列动态发射，不等待全 level 完成

### 9.6 兼容测试

建议在 `tests/compatibility/` 放跨语言测试。

#### `py-conf-ts-run`

步骤：

1. 调 Python `annopi conf`
2. 校验输出的 `tasks.yml`
3. 调 TS `annopi run`
4. 校验 `.sign` 和最终状态

#### `ts-conf-py-run`

步骤：

1. 调 TS `annopi conf`
2. 校验输出的 `tasks.yml`
3. 调 Python `annopi run`
4. 校验 `.sign` 和最终状态

### 9.7 fixture 组织

建议：

```text
tests/fixtures/
├── pipeline/
│   ├── basic.yml
│   ├── with_deps.yml
│   ├── with_group_by.yml
│   └── with_cycle.yml
├── project/
│   ├── basic.yml
│   ├── with_cmp.yml
│   ├── with_cmp_group.yml
│   └── with_optional_fields.yml
├── modules/
│   ├── qc/
│   │   └── task.yml
│   └── merge/
│       └── task.yml
└── expected/
    ├── tasks-local.yml
    └── tasks-qsubsge.yml
```

---

## 十、建议的开发顺序

### 10.1 第 0 步：脚手架

完成条件：

1. workspace 可安装
2. `pnpm build` 可跑
3. `pnpm test` 可跑
4. 每个 package 有最小 `package.json`

### 10.2 第 1 步：`core/model` + parser

完成条件：

1. `parseProjectConfig()`
2. `parsePipelineConfig()`
3. 基础单元测试通过

### 10.3 第 2 步：validator

完成条件：

1. `${deps.xxx}` 校验
2. `${config.xxx}` 校验
3. `${sample.xxx}` 校验

### 10.4 第 3 步：task loader

完成条件：

1. imports 优先级正确
2. path 覆盖正确
3. inline 覆盖正确
4. deps merge 正确

### 10.5 第 4 步：`ParamResolver`

完成条件：

1. 所有核心 pattern 场景覆盖
2. 与 Python 主要行为对齐

这是开发中最关键的一步，应独立提交。

### 10.6 第 5 步：DAG + generators

完成条件：

1. 脚本能生成
2. `tasks.yml` 能生成
3. local/qsubsge 命令正确

### 10.7 第 6 步：state + runtime

完成条件：

1. `.sign` 语义正确
2. ready 队列语义正确
3. 单任务和依赖链执行通过

### 10.8 第 7 步：workflow + CLI

完成条件：

1. `annopi conf` 可用
2. `annopi run` 可用
3. `annopi install` 可用

### 10.9 第 8 步：跨语言兼容测试

完成条件：

1. `py-conf-ts-run` 通过
2. `ts-conf-py-run` 通过

这一步通过后，V1 才算真正完成。

---

## 十一、提交建议

建议按主题提交，而不是一口气堆完：

1. `chore: scaffold monorepo packages`
2. `feat(core): add project and pipeline models`
3. `feat(core): implement validator`
4. `feat(node): implement task loader and deps merge`
5. `feat(core): port param resolver`
6. `feat(node): generate scripts and tasks yml`
7. `feat(node): implement tasks state and pipeline runtime`
8. `feat(cli): add conf run install commands`
9. `test: add python typescript compatibility coverage`

---

## 十二、V1 验收清单

满足以下全部条件，才算 V1 结束：

1. `pnpm test` 通过
2. `pnpm typecheck` 通过
3. `annopi conf -p ... -c ... -o ...` 可生成 `shell/*.sh` 和 `<outdir>/tasks.yml`
4. `annopi run -o ...` 可正确执行并写 `.sign`
5. local 模式实际走 `ata`
6. qsubsge 模式生成 `annotask qsubsge`
7. Python `run` 能执行 TS `conf` 产物
8. TS `run` 能执行 Python `conf` 产物
9. 文档中不再把 report 误写成 core 能力

---

## 十三、后续文档

V1 结束后，配套文档分独立文件维护，不继续堆到同一份方案里：

1. `docs/annopi-ts-node-api.md` — 待编写
2. `docs/annopi-ts-compatibility.md` — 待编写
3. [docs/annopi-report-design.md](./annopi-report-design.md) — **已完成**

report 设计文档已定义：

1. report 模块目录结构
2. `upload/` 组织约定
3. 报告任务如何通过普通 task 接入 pipeline
4. 模板上下文与引擎选择（复用 `../rst`，不移植 Python Jinja2 + Sphinx）

---

## 十四、结论

V2.1 的核心思想只有一句话：

先把 annopi-ts V1 做成一个稳定、可互操作的流程引擎，再把 report 作为独立的模块层能力叠加上去。

这能保证第一阶段的实现边界清晰，也最符合 Python 版 annopi 当前代码的真实结构。
