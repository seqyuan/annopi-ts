# annopi → annopi-ts 重写方案 V2

> 目标：将 Python 版 annopi 重写为 TypeScript，并确保 Python/TS 两个实现对
> `pipeline.yml`、`project.yml`、`tasks.yml` 和 `.sign` 机制保持互相可读可跑。
> V1 聚焦流程引擎与互操作，不包含 report 系统实现。

## 一、目标重述

### 1.1 核心目标

annopi-ts V1 要解决的是三件事：

1. 提供纯 TypeScript 的流程配置解析、参数展开、DAG 构建、脚本生成、状态执行能力
2. 保持与 Python 版 annopi 的任务文件和执行语义互操作
3. 作为 npm 包嵌入 annovibe / annox / 其他 Node.js 服务

### 1.2 “完全兼容”的定义

本方案中的“完全兼容”明确指：

1. Python 版 `annopi conf` 生成的 `tasks.yml`，TS 版 `annopi run` 可以执行
2. TS 版 `annopi conf` 生成的 `tasks.yml`，Python 版 `annopi run` 可以执行
3. 两边都能读取相同的 `pipeline.yml` / `project.yml`
4. 两边都遵守相同的 `.sign` 断点续跑语义

不要求：

1. YAML 序列化逐字节一致
2. 时间戳字段完全相同
3. 注释、空行、键顺序在所有场景下完全一致
4. V1 包含 report 模板渲染能力

### 1.3 V1 不做什么

V1 不包含：

1. `annopi report` 命令
2. Jinja2 / Handlebars / rst 模板渲染器
3. report 模块规范的 TypeScript 迁移
4. annovibe UI 层改造

V1 只做流程引擎和 CLI 互操作最小闭环。

---

## 二、对 Python 版现状的重新归纳

### 2.1 当前真正的核心边界

按 Python 实现，annopi 的核心能力是：

1. 解析 `pipeline.yml` 和 `project.yml`
2. 加载 task 模块并合并 deps
3. 展开 `${sample.*}` / `${cmp.*}` / `${config.*}` / `${deps.*}`
4. 构建 DAG 和任务编号
5. 生成 `shell/*.sh` 和 `<outdir>/tasks.yml`
6. 按 `tasks.yml` + `.sign` 执行流程

这里没有 report 的必需耦合。

### 2.2 report 在 Python 版中的真实定位

report 在当前 annopi 中是外围能力，不是调度核心的一部分：

1. 报告任务被设计为普通 task，通过 `depends` 接入 DAG
2. `annopi report` 只是一个辅助 CLI，把模板渲染成 `.rst`
3. 模块自己提供 `report/template.rst.j2` 和整理 `upload/` 的脚本

因此，report 属于“具体流程编排层面的模块能力”，不是 core 引擎能力。

### 2.3 local 执行器与 qsubsge 执行器

Python 版 `tasks.yml` 生成有两个不同的本地/集群执行后端：

1. `resources.executor: local` 时，`runcmd` 实际调用的是 `ata`
2. `resources.executor: qsubsge` 时，`runcmd` 调用的是 `annotask qsubsge`

因此 annopi-ts 不能把执行器统一抽象成 `annotask`。

### 2.4 run 的真实输入

Python 版 `annopi run` 的输入不是 `pipeline.yml` / `project.yml`，而是已经生成好的
`<outdir>/tasks.yml`。这意味着：

1. `run` 阶段与 `conf` 阶段解耦
2. 互操作的关键文件是 `tasks.yml`
3. CLI 兼容性必须围绕 `outdir` 而不是重新解析 pipeline/project

---

## 三、V2 架构原则

### 3.1 分层原则

V1 采用三层结构：

1. `core`：纯流程模型和算法
2. `node`：Node.js 文件系统 / 子进程适配
3. `cli`：命令行包装

这样可以避免把 report、git 安装器、模板渲染器之类的外围能力塞进核心库。

### 3.2 兼容性优先于重设计

V1 的优先级是：

1. 行为兼容
2. 文件格式兼容
3. API 可嵌入
4. 再考虑架构美化

如果某个“更优雅”的设计会改变 Python 版行为，V1 不采用。

### 3.3 report 降层

report 在本方案中明确降为：

1. 后续独立 package
2. 或上层模块体系中的一个普通 task 模式

不再作为 `annopi-core` 的职责。

---

## 四、建议的 package 结构

```text
annopi-ts/
├── packages/
│   ├── core/                 # @seqyuan/annopi-core
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── resolver/
│   │   │   ├── dag/
│   │   │   ├── model/
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── node/                 # @seqyuan/annopi-node
│   │   ├── src/
│   │   │   ├── loader/
│   │   │   ├── generator/
│   │   │   ├── state/
│   │   │   ├── modules/
│   │   │   ├── runtime/
│   │   │   └── index.ts
│   │   └── tests/
│   │
│   ├── cli/                  # @seqyuan/annopi
│   │   └── src/
│   │
│   └── extension/            # @seqyuan/annopi-extension
│       └── src/
│
├── docs/
│   ├── annopi-ts-rewrite-plan.md
│   └── annopi-ts-rewrite-plan-v2.md
└── ...
```

### 4.1 `core` 的职责

`core` 只包含无环境耦合的逻辑：

1. 配置类型定义
2. `pipeline.yml` / `project.yml` 的数据模型
3. 参数解析器
4. DAG builder
5. 任务状态模型
6. 纯函数校验逻辑

### 4.2 `node` 的职责

`node` 负责所有 Node 环境相关能力：

1. YAML 文件读写
2. task 模块加载
3. shell 脚本生成
4. `tasks.yml` 生成
5. `.sign` 文件操作
6. `child_process` 执行
7. git 模块安装

### 4.3 `cli` 的职责

`cli` 只负责参数解析、错误码、输出格式，不承载核心业务逻辑。

---

## 五、数据模型

### 5.1 `project.yml`

TS 侧建议保留“原始结构 + 类型化视图”双轨模型：

```ts
export interface ProjectConfig {
  raw: Record<string, unknown>;
  samples: Array<Record<string, unknown>>;
  comparisons: Array<Record<string, unknown>>;
  params: Record<string, unknown>;
  combines: string[];
}
```

说明：

1. 不强行把 `project.yml` 完全静态化
2. 保留 `raw`，因为 `${config.xxx}` 是按动态路径读取
3. `cmp` 需要兼容两种写法：
   - `cmp: []`
   - `cmp: { group: [] }`

### 5.2 `pipeline.yml`

尽量贴近 Python 版实际结构，而不是预先设计过宽的 schema：

```ts
export interface PipelineConfig {
  name: string;
  version: string;
  imports: string[];
  tasks: Record<string, Record<string, unknown>>;
  dependencies: Record<string, string[]>;
  deps: Record<string, string>;
}
```

### 5.3 `tasks.yml`

这是跨语言互操作的关键文件，建议显式建模为：

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

注意：

1. `runcmd` 是必须字段
2. `pipeline` 和 `generated_at` 也是实际存在字段
3. `tasks.yml` 位于 `<outdir>/tasks.yml`，不是 `shell/tasks.yml`

---

## 六、核心模块设计

### 6.1 配置解析

`core` 负责“从对象到模型”的校验和标准化，`node` 负责读文件和 YAML 反序列化。

模块建议：

1. `packages/core/src/config/project.ts`
2. `packages/core/src/config/pipeline.ts`
3. `packages/core/src/config/validator.ts`
4. `packages/node/src/loader/yaml.ts`

### 6.2 任务加载器

任务加载属于 Node 层能力，因为要读本地文件系统和 `~/.annopi/tasks/`。

建议模块：

1. `packages/node/src/loader/task-loader.ts`
2. `packages/node/src/modules/namespace-resolver.ts`

必须保持 Python 版优先级：

1. `imports` 加载的外部模块，最低优先级
2. `tasks.<name>.path` 的本地引用，中间优先级
3. `tasks.<name>` 的纯内联定义，最高优先级

### 6.3 参数解析器

这是 V1 最重要的核心模块。

需要保持的行为：

1. `${config.xxx}` 动态路径查找
2. `${deps.xxx}` 依赖路径替换
3. `${sample.xxx}` 样本展开
4. `${sample.field? content}` 可选块
5. `group_by + ${sample[field=value].xxx}` 组内交叉引用
6. `${cmp.xxx}` 比较组展开
7. `${cmp.case_samples.xxx}` / `${cmp.control_samples.xxx}` 样本聚合
8. 禁止在同一 task 中混用 `${sample.*}` 和 `${cmp.*}`

接口建议：

```ts
export interface ExpandedParams {
  values: Record<string, string>;
}

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
  ): ExpandedParams[];

  renderCommand(
    command: string,
    resolvedParams: Record<string, string>,
  ): string;
}
```

这里不必为了“更优雅”改掉 Python 版的 `__annopi_command__` 机制，只要行为清晰可测即可。

### 6.4 DAG Builder

DAG builder 负责：

1. 拓扑排序
2. 环检测
3. `numbered_name` 生成
4. `level` 计算

但 `level` 只用于编号和展示，不应用作执行屏障。

### 6.5 Script Generator

脚本生成保持极简：

1. 每个任务一个 `shell/<numbered_name>.sh`
2. 内容就是展开后的多行命令
3. 末尾补换行

不生成 `.sh.run`。

### 6.6 `tasks.yml` Generator

该模块是互操作关键点。

需要支持两种执行后端：

1. `local` 模式：生成 `ata ...`
2. `qsubsge` 模式：生成 `annotask qsubsge ...`

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
  ): TasksFile;
}
```

关键兼容点：

1. local 模式默认 runner 是 `ata`
2. 若声明了 deps 中的 `ata` 路径，则优先使用该路径
3. local 模式 `lines` 取 `max(configuredLines, script实际行数)`
4. qsubsge 模式追加 `--cpu --mem --h_vmem --queue --mode --hostname --project`

### 6.7 Tasks State

状态管理属于 Node 层，因为要读写 `tasks.yml` 和 `.sign`。

保持 Python 语义：

1. `.sign` 是最终权威
2. 启动时 `refreshFromSigns()`
3. 有 `.sign` 则状态强制为 `done`
4. 无 `.sign` 且状态不是 `pending` 则重置为 `pending`
5. `getReady()` 只返回依赖全 `done` 且自身 `pending` 的任务

---

## 七、CLI 设计

### 7.1 命令集合

V1 CLI 只保留：

```bash
annopi conf -p pipeline.yml -c project.yml -o ./output
annopi run -o ./output
annopi install <source> [--update]
```

不包含：

```bash
annopi report ...
```

### 7.2 `conf`

`conf` 负责：

1. 读取 `pipeline.yml` / `project.yml`
2. 加载 task
3. 校验 refs 和 deps
4. 展开命令
5. 生成 `shell/*.sh`
6. 生成 `<outdir>/tasks.yml`

### 7.3 `run`

`run` 必须兼容 Python 版现状，只接收 `outdir`：

```bash
annopi run -o ./output
```

`run` 的职责：

1. 读取 `<outdir>/tasks.yml`
2. 扫描 `<outdir>/shell/*.sh.sign`
3. 按 ready 队列持续发射任务
4. 写回 `tasks.yml`

### 7.4 `run` 的调度模型

不要把执行模型改成“按 DAG level 分波次串行”。

应保持 Python 语义：

1. 只要任务依赖满足，就立即进入 ready
2. executor 持续消费 ready 任务
3. 某任务完成后，其下游如果满足条件，下一轮立刻发射

这是“事件驱动的 ready 队列”，不是“按 level barrier 执行”。

### 7.5 `install`

`install` 保持 Python 版的两类来源：

1. Git 源，例如 `github.com/user/repo/taskname@v1.2.3`
2. 本地路径

V1 可以先保持 Python 版简化模型，不急着扩展 registry 机制。

---

## 八、顶层 API 设计

### 8.1 `core` 不直接暴露重量级 `AnnoPi` 类

建议不要在 `core` 中塞一个同时负责读文件、执行 shell、写状态的 `AnnoPi` 大类。

更合理的是：

1. `core` 暴露纯算法和模型
2. `node` 暴露工作流服务对象

### 8.2 `node` 层工作流服务

建议定义在 `@seqyuan/annopi-node`：

```ts
export interface AnnopiWorkflowOptions {
  pipelinePath: string;
  projectPath: string;
  outdir: string;
}

export class AnnopiWorkflow {
  constructor(options: AnnopiWorkflowOptions);

  conf(): Promise<{
    pipelineName: string;
    outdir: string;
    shellDir: string;
    tasksPath: string;
    taskCount: number;
  }>;

  run(): Promise<{
    outdir: string;
    completed: string[];
    failed: string[];
  }>;
}
```

如果 annovibe / annox 要嵌入，应该依赖 `@seqyuan/annopi-node`，而不是 `cli`。

---

## 九、report 的重新定位

### 9.1 架构定位

report 不是流程引擎能力，而是模块层能力：

1. 分析模块产出 `process/`
2. 模块可额外整理 `upload/`
3. 报告模块或报告 task 基于 `upload/` 生成文档
4. 这些都通过普通 task + `depends` 表达

### 9.2 为什么 V1 不纳入 report

原因不是 report 不重要，而是它属于另一层：

1. 它不影响 `tasks.yml` 互操作
2. 它不是 DAG / 参数解析 / 状态机 的一部分
3. 现有模板使用 Jinja2 特性较多，压到 V1 会显著扩大范围

### 9.3 后续如何承接

V2/V3 可以单独定义：

1. `@seqyuan/annopi-report`
2. report 模块目录规范
3. `upload/` 组织约定
4. 模板上下文约定

但这应是独立文档，不与 V1 核心引擎重写耦合。

---

## 十、测试策略

### 10.1 测试优先级

V1 测试优先级如下：

1. `param-resolver`
2. `tasks.yml` 生成
3. `tasks-state`
4. task loader 优先级
5. `run` 调度互操作

### 10.2 互操作测试

必须新增跨实现测试，而不只是单边单元测试：

1. Python `conf` -> TS `run`
2. TS `conf` -> Python `run`
3. TS `conf` 输出的 `tasks.yml` 被 Python `TasksState` 正常读取
4. Python `conf` 输出的 `tasks.yml` 被 TS `TasksState` 正常读取

### 10.3 建议的 fixture 目录

```text
tests/
├── fixtures/
│   ├── pipeline/
│   ├── project/
│   ├── modules/
│   └── expected/
├── compatibility/
│   ├── py-conf-ts-run.test.ts
│   └── ts-conf-py-run.test.ts
└── unit/
```

### 10.4 端到端断言

V1 的 e2e 断言应聚焦：

1. `shell/*.sh` 是否正确生成
2. `<outdir>/tasks.yml` 字段是否兼容
3. `run` 是否遵守 `.sign` 语义
4. local 模式是否调用 `ata`
5. qsubsge 模式是否生成正确 `annotask qsubsge` 命令

---

## 十一、实施路线

### Phase 1：仓库骨架与类型模型

1. 创建 `packages/core` / `packages/node` / `packages/cli`
2. 建立 `tsconfig`、`tsup`、`vitest`
3. 定义 `ProjectConfig` / `PipelineConfig` / `TasksFile`

### Phase 2：配置解析与任务加载

1. YAML 读写
2. project/pipeline parser
3. task loader
4. deps merge
5. validator

### Phase 3：参数解析器

1. `resolveString`
2. `detectMode`
3. sample 展开
4. cmp 展开
5. optional block
6. cross-ref
7. command render

这是整个 V1 最关键阶段。

### Phase 4：生成器与状态管理

1. DAG builder
2. script generator
3. `tasks.yml` generator
4. `tasks-state`

### Phase 5：CLI 与执行器

1. `conf`
2. `run`
3. `install`
4. ready-queue 调度

### Phase 6：跨语言互操作测试

1. Python `conf` -> TS `run`
2. TS `conf` -> Python `run`
3. `.sign` 断点续跑测试

### Phase 7：annovibe / annox 嵌入

1. `@seqyuan/annopi-extension`
2. headless Node API 文档

---

## 十二、成功标准

1. TS `conf` 生成的 `<outdir>/tasks.yml` 可被 Python `annopi run -o <outdir>` 正常执行
2. Python `conf` 生成的 `<outdir>/tasks.yml` 可被 TS `annopi run -o <outdir>` 正常执行
3. TS `run` 在 local 模式下生成并执行 `ata` 命令，而不是误用 `annotask`
4. TS `run` 遵守 Python 版 `.sign` 权威语义
5. TS `run` 保持 ready-queue 调度语义，而不是 level barrier 执行
6. `param-resolver` 的主要 Python 行为全部被 fixture 覆盖
7. V1 不包含 report，但不会阻碍后续把 report 作为普通模块/task 叠加

---

## 十三、对原方案的主要修订

相对 `annopi-ts-rewrite-plan.md`，本 V2 方案做了这些关键修订：

1. 重新定义“完全兼容”为“互相可读可跑”
2. 移除 V1 中的 report 实现目标
3. 把 report 从 core 降为模块层能力
4. 把执行器区分为 `local=ata` 与 `qsubsge=annotask`
5. 将 `run` CLI 改回只依赖 `outdir`
6. 将执行模型改回 ready-queue，而不是按 level 分波次
7. 将 package 结构改为 `core/node/cli` 三层

---

## 十四、参考

1. `../annopi/annopi/cli/conf.py`
2. `../annopi/annopi/cli/run_cmd.py`
3. `../annopi/annopi/generator/param_resolver.py`
4. `../annopi/annopi/generator/tasks_yml_generator.py`
5. `../annopi/annopi/state/tasks_state.py`
6. `../annopi/docs/REPORT_SYSTEM.md`
7. `../annopi/IMPLEMENTATION_SUMMARY.md`
