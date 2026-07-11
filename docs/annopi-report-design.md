# annopi-ts Report 系统设计

> 本文档定义 annopi-ts 生态中 **报告生成** 的架构边界、技术选型与落地约定。
>
> 前提：
> - V1 只做流程引擎（`conf` / `run` / `install`），**不包含** report 实现。
> - report **不复刻** Python 版 Jinja2 + Sphinx 渲染链，而是复用同级项目 [`../rst`](../../rst)。
> - report 仍是 **普通 pipeline task**，通过 `depends` 接入 DAG，不进入 `@seqyuan/annopi-core`。

上位文档：

- [annopi-ts-rewrite-plan-v2.md](./annopi-ts-rewrite-plan-v2.md)
- [annopi-ts-rewrite-plan-v2.1.md](./annopi-ts-rewrite-plan-v2.1.md)
- Python 版参考：[../annopi/docs/REPORT_SYSTEM.md](../../annopi/docs/REPORT_SYSTEM.md)

---

## 一、文档目标

本文档回答四个问题：

1. report 在 annopi-ts 架构里处于哪一层
2. 为什么用 `../rst` 而不是移植 Python 渲染方案
3. `upload/`、模板、上下文、pipeline task 如何约定
4. 从 Python `annopi report` 迁移到 `rst-render` 的路径是什么

---

## 二、设计原则（继承 Python 版）

以下原则与 Python 版 [REPORT_SYSTEM.md](../../annopi/docs/REPORT_SYSTEM.md) 保持一致：

1. **报告就是普通 task** — 在 `pipeline.yml` 里和其他任务没有区别，靠 `depends` 表达依赖。
2. **模块自带模板** — task 模块目录提供 `report/template.rst.j2`（或等价路径），随模块分发、复用。
3. **分析产出与报告素材分离** — 原始输出放 `process/`，整理后的可引用文件放 `upload/`。
4. **报告不耦合调度核心** — 不影响 `tasks.yml` 互操作，不进入 DAG builder / ParamResolver / TasksState。

---

## 三、技术选型：用 `../rst`，不移植 Python 渲染链

### 3.1 Python 版现状

Python `annopi report` 做两件事：

1. 用 **Jinja2** 把 `.rst.j2` 渲染成 `.rst`
2. （可选）再用 **Sphinx** 把 `.rst` 构建成 HTML

核心代码在 `annopi/report/template_renderer.py`，体量小，但依赖 Python 运行时和 Jinja2 生态。

### 3.2 新方案：复用 rst 项目

[`../rst`](../../rst) 已提供完整 TypeScript 报告链路：

| 能力 | 包 / 入口 |
|------|-----------|
| Jinja2 兼容模板引擎 | `@seqyuan/rst-renderer` → `renderTemplate()` |
| 模板 → RST → HTML 一步完成 | `@seqyuan/rst-renderer` → `renderRstTemplate()` |
| RST 解析 + HTML / Markdown / React | `@seqyuan/rst-renderer` 渲染器链 |
| CLI（`--data` / `--scan` / `--var` / `-t`） | `@seqyuan/rst-cli` → `rst-render` |

因此：

- **annopi-ts 不再内置** `template_renderer`、handlebars、Sphinx 封装
- **annopi-ts 不再提供** `annopi report` 作为核心命令
- 报告渲染统一走 **`rst-render`** 或 **`import @seqyuan/rst-renderer`**

### 3.3 选型收益

1. **技术栈统一** — 业务层全部 TypeScript，可嵌入 annovibe / annox Node 服务。
2. **避免重复建设** — rst 已有模板测试（含 annopi 风格 `data.tables` / `data.images` 用例）。
3. **输出更丰富** — 除中间 `.rst` 外，可直接输出 standalone HTML，无需 Sphinx 构建链。
4. **边界清晰** — annopi-ts 管「跑流程」，rst 管「写报告」。

---

## 四、架构定位

```text
┌─────────────────────────────────────────────────────────────┐
│  pipeline task（普通 task，depends 接入）                      │
│    ├── 分析任务 → 写 process/                                │
│    ├── 整理任务 → 写 upload/                                 │
│    └── 报告任务 → 调 rst-render / rst-renderer               │
├─────────────────────────────────────────────────────────────┤
│  @seqyuan/annopi-node / annopi-ts CLI                       │
│    conf / run / install — 流程引擎，不含 report 渲染         │
├─────────────────────────────────────────────────────────────┤
│  ../rst                                                     │
│    @seqyuan/rst-renderer — 模板 + RST 解析 + HTML 渲染       │
│    @seqyuan/rst-cli      — rst-render 命令行                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 不在 annopi-ts 内的内容

- Jinja2 / Sphinx 移植
- `packages/core/src/report/`
- `annopi report` 作为 annopi-ts CLI 的一等子命令（见 §9.2 兼容策略）

### 4.2 可选的薄封装

若需要 Node API 或 annovibe 内嵌，可增加 **`@seqyuan/annopi-report`**（独立 package，依赖 rst）：

- 职责：把 annopi 约定的 `upload/` 扫描、`--data` 目录语义，转成 rst 模板上下文
- 不负责：RST 解析、HTML 渲染（全部委托 rst）
- 不进入：`@seqyuan/annopi-core`

---

## 五、目录结构约定

沿用 Python 版项目布局，report 相关目录由 **具体 pipeline / 模块** 管理，不由 annopi-ts 引擎创建。

```text
<project>/
├── pipeline.yml
├── project.yml
├── shell/                         # annopi conf 生成
│   ├── 1-0-cellranger.sh
│   ├── 2-0-cellranger_report.sh
│   └── ...
├── <outdir>/
│   └── tasks.yml                  # annopi conf 生成
├── process/                       # 任务原始输出（模块自定）
│   ├── cellranger/
│   └── qc/
├── upload/                        # 整理后的可引用素材（模块自定）
│   ├── cellranger/
│   │   ├── summary.csv
│   │   └── plots/
│   └── qc/
└── report/                        # 报告工作区（模块 / pipeline 自定）
    ├── project.json               # 项目元数据（推荐）
    ├── assets/
    ├── source/                    # 可选：中间 .rst（若走两步渲染）
    │   ├── cellranger.rst
    │   └── index.rst
    └── build/                     # 可选：最终 HTML
        └── index.html
```

### 5.1 三类目录职责

| 目录 | 谁写 | 用途 |
|------|------|------|
| `process/` | 分析 task | 原始结果、中间文件，一般不直接进报告模板 |
| `upload/` | 整理 task（或分析 task 末尾脚本） | 报告可引用的表格、图片、附件；路径稳定、相对路径可写进 RST |
| `report/` | 报告 task | 模板、元数据 JSON、渲染输出 |

### 5.2 task 模块内报告资产

```text
~/.annopi/tasks/cellranger/v1.0.0/
├── task.yml
└── report/
    └── template.rst.j2            # 或 report.rst.j2
```

模块只提供 **模板** 和（可选）**整理 upload 的脚本**；渲染执行发生在项目 `report/` 目录。

---

## 六、报告任务如何接入 pipeline

报告任务在 `pipeline.yml` 中写法与 Python 版相同，仅把命令中的 `annopi report` 换成 `rst-render`。

### 6.1 单模块报告（推荐：直接出 HTML）

```yaml
tasks:
  cellranger:
    command: cellranger count --id=${sample.id} ...
    # ...

  cellranger_report:
    command: |
      rst-render \
        ~/.annopi/tasks/cellranger/v1.0.0/report/template.rst.j2 \
        -t \
        -d report/project.json \
        --scan tables=upload/cellranger/*.csv \
        --scan plots=upload/cellranger/plots/*.png \
        -v project_name=${config.Para.project_name} \
        -v description="${config.Para.description}" \
        -o report/build/cellranger.html \
        -s
    depends: [cellranger]
```

说明：

- `-t`：先按 Jinja2 兼容语法渲染模板，再解析 RST → HTML
- `-d report/project.json`：项目级元数据（样本列表、分组、描述等）
- `--scan`：按 glob 注入文件列表（见 §8.2）
- `-s`：standalone HTML，内联 CSS/图片，便于分发

### 6.2 多模块汇总报告

```yaml
  final_report:
    command: |
      rst-render \
        templates/index.rst.j2 \
        -t \
        -d report/project.json \
        --scan modules=report/source/*.rst \
        -v project_name=${config.Para.project_name} \
        -o report/build/index.html \
        -s
    depends: [cellranger_report, qc_report]
```

若仍需 **中间 `.rst` 源文件**（例如分步构建），可先输出 RST，再二次渲染：

```bash
# 步骤 1：模板 → RST
rst-render template.rst.j2 -t -d report/project.json \
  --scan tables=upload/cellranger/*.csv \
  -o report/source/cellranger.rst

# 步骤 2：RST → HTML
rst-render report/source/cellranger.rst -o report/build/cellranger.html -s
```

新 pipeline **优先单步 `-t` 直出 HTML**；两步链仅用于需要人工审阅中间 RST 的场景。

### 6.3 与 annopi-ts 引擎的关系

- `annopi conf`：照常展开 `${config.*}` / `${sample.*}`，生成 `shell/*_report.sh`
- `annopi run`：把 `rst-render ...` 当作普通 shell 命令执行
- report 命令 **不出现在** annopi-ts CLI 中

---

## 七、渲染链路

### 7.1 标准链路（推荐）

```text
report/template.rst.j2
        │
        ├─ project.json          （-d，结构化元数据）
        ├─ --scan glob 匹配      （upload/ 下文件列表）
        └─ --var key=value       （pipeline 展开后的标量变量）
        │
        ▼
  @seqyuan/rst-renderer
    renderRstTemplate()
        │
        ▼
  standalone HTML（-s）或 stdout
```

### 7.2 程序化调用（annovibe / annox）

```ts
import { renderRstTemplate } from '@seqyuan/rst-renderer'
import { buildTemplateContext } from '@seqyuan/rst-cli/context' // 或等价 helper

const template = readFileSync('report/template.rst.j2', 'utf-8')
const context = buildTemplateContext(
  'report/project.json',
  { project_name: 'Demo' },
  [{ key: 'plots', pattern: 'upload/cellranger/plots/*.png' }],
  dirname('report/template.rst.j2'),
)

const html = renderRstTemplate(template, context, {
  includeResolver: { baseDir: 'report/' },
})
```

服务内嵌时应 **import rst-renderer**，而不是 `subprocess` 调 annopi。

### 7.3 不再依赖 Sphinx 的理由

| 维度 | Sphinx（Python 旧链） | rst-render（新链） |
|------|----------------------|-------------------|
| 运行时 | Python + Sphinx | Node / 浏览器均可 |
| 构建速度 | 慢，主题/扩展重 | 单次 parse + render |
| 嵌入 annovibe | 需子进程调 Python | 直接 import |
| 模板引擎 | Jinja2（Python） | rst 内置 Jinja2 兼容引擎 |

现有模块若仍依赖 `sphinx-build`，可在迁移期保留为 **普通 shell 命令**，但不作为 annopi-ts / rst 的官方推荐路径。

---

## 八、模板上下文约定

### 8.1 三类上下文来源

| 来源 | rst-render 参数 | 典型内容 |
|------|-----------------|----------|
| 结构化元数据 | `-d project.json` | `samples`、`groups`、`parameters`、`title` |
| 文件扫描 | `--scan name=glob` | 图片、表格、附件列表 |
| 标量变量 | `-v key=value` | `project_name`、`description`、模块版本 |

`--var` 覆盖 `-d` 中同名键；`--scan` 结果同时写入顶层变量名和 `scans` 聚合对象（rst-cli 行为）。

### 8.2 `--scan` 注入结构（rst 标准）

每个匹配文件变为：

```ts
interface ScanMatch {
  path: string      // 相对模板目录，如 upload/plots/S1_umap.png
  absPath: string
  name: string      // 文件名
  stem: string      // 无扩展名
  ext: string       // .png
  dir: string       // 相对目录
  size: number      // 字节
}
```

模板示例：

```jinja2
{% for plot in plots %}
.. image:: {{ plot.path }}
   :width: 600px

{% endfor %}
```

这是 **新 pipeline 的推荐写法**，比 Python 版手工拼接 `../../upload/{{ img }}` 更稳。

### 8.3 Python 兼容：`data.tables` / `data.images`

Python `annopi report --data upload/cellranger` 会注入：

```python
data = {
    'tables': ['summary.csv', ...],   # .csv/.tsv/.txt
    'images': ['plots/a.png', ...],     # 图片
    'files':  [...],                  # 全部相对路径
}
```

rst 模板引擎 **已测试** annopi 风格模板（`data.tables[0]`、`{% for img in data.images %}`）。

为兼容旧模板，需在 rst 侧补一层目录扫描（见 §9.1），或在整理 task 中预写 `report/project.json`：

```json
{
  "data": {
    "tables": ["upload/cellranger/summary.csv"],
    "images": ["upload/cellranger/plots/qc.png"],
    "files": ["upload/cellranger/summary.csv", "upload/cellranger/plots/qc.png"]
  }
}
```

**新模块优先 `--scan`；旧模块迁移期保留 `data.*` 结构。**

### 8.4 汇总报告：`modules` 变量

Python `--scan "report/source/*.rst"` 注入：

```python
modules = [
  {'name': 'cellranger', 'path': 'report/source/cellranger.rst'},
  ...
]
```

rst 等价写法：

```bash
--scan modules=report/source/*.rst
```

模板中 `modules` 为 `ScanMatch[]`，字段为 `path` / `name` / `stem` 等。旧模板里的 `module.path` 仍可用，但 `name` 对应 `stem` 时需按 `ScanMatch` 字段微调。

---

## 九、与 Python `annopi report` 的差异与迁移

### 9.1 行为差异一览

| 行为 | Python `annopi report` | `rst-render`（现状） | 迁移策略 |
|------|------------------------|----------------------|----------|
| `--data` | 扫描**目录**，生成 `data.*` | 读取 **JSON 文件** | 在 rst-cli 增加 `--data-dir`，或由整理 task 写 JSON |
| `--scan` | 注入 `modules[{name,path}]` | 注入 `ScanMatch[]` | 新模板用 `plot.path`；旧模板加薄适配 |
| 输出 | 默认写 `.rst` | 默认 HTML；`-t` 可先模板化 | 新 pipeline 直出 HTML |
| 模板引擎 | Jinja2（Python） | Jinja2 兼容子集（TS） | 见 §9.3 |
| 二级构建 | `sphinx-build` | `-s` standalone HTML | 逐步弃用 Sphinx 依赖 |

### 9.2 CLI 兼容策略

**官方推荐**：pipeline 中直接写 `rst-render`，不再新增 `annopi report`。

可选兼容（低优先级）：

```bash
# 若需要平滑迁移，可在 annopi-ts CLI 做废弃别名
annopi report <template> <output> [options]
  → 打印 deprecation 警告
  → 转调 rst-render 等价参数
```

该别名 **不属于 V1**，也不属于 report 核心设计；仅作为迁移期便利。

### 9.3 模板语法兼容边界

rst 内置模板引擎覆盖 annopi 常用子集：

- `{{ var }}`、`{{ obj.field }}`、`{{ items["k"] }}`
- `{% for %}` / `{% if %}` / `{% else %}`
- 常用 filters：`default`、`length`、`upper`、`lower`、`join`、`tojson` 等

**不保证** Python Jinja2 全特性（如 `extends`/`block`、复杂表达式、`'=' * n` 字符串重复等）。迁移时应对照 [rst 模板引擎文档](../../rst/web/content/docs/template-engine.mdx) 做模板审查。

### 9.4 迁移检查清单（单模块）

1. 把 `annopi report` 换成 `rst-render ... -t`
2. 把 `--data upload/foo` 改为 `--scan` + `project.json`，或等 `--data-dir` 落地
3. 检查模板中图片路径是否改用 `{{ item.path }}`
4. 用 `rst-render ... -s` 验证 HTML 输出，替代 `sphinx-build`
5. 在 pipeline 里保持 `depends` 不变

---

## 十、package 边界与依赖

### 10.1 依赖关系

```text
@seqyuan/annopi-core        （无 report 依赖）
@seqyuan/annopi-node        （无 report 依赖）
@seqyuan/annopi         （无 report 依赖；可选 deprecation 别名）
@seqyuan/annopi-report      （可选；依赖 @seqyuan/rst-renderer + rst-cli context helpers）
@seqyuan/rst-renderer       （模板 + 渲染核心）
@seqyuan/rst-cli            （rst-render 命令）
```

### 10.2 `@seqyuan/annopi-report` 建议职责（若创建）

```text
packages/report/
├── src/
│   ├── scan-upload-dir.ts    # 复刻 Python data.{tables,images,files} 语义
│   ├── build-context.ts      # 合并 JSON + scan + var + data-dir
│   └── index.ts
└── package.json
```

接口示意：

```ts
export function scanUploadDir(uploadPath: string): {
  tables: string[]
  images: string[]
  files: string[]
}

export function buildAnnopiReportContext(options: {
  dataDirs?: string[]
  dataJson?: string
  scans?: Array<{ key: string; pattern: string }>
  vars?: Record<string, string>
  baseDir: string
}): Record<string, unknown>
```

该包 **不是 V1 必需**；可在 rst-cli 吸收 `scanUploadDir` 后省略。

---

## 十一、开发顺序

report 在 annopi-ts V1 完成之后独立推进，建议顺序：

### 第 1 步：rst 侧补齐 annopi 互操作

完成条件：

1. `rst-cli` 支持 `--data-dir <path>`（可多选），输出 Python 兼容 `data.*`
2. 或文档化「整理 task 写 `project.json`」规范并在 examples 验证
3. `annopi-style` 模板测试在 rst 仓库通过

### 第 2 步：示例 pipeline 迁移

完成条件：

1. 将 [cellranger_example](../../annopi/examples/cellranger_example/) 改为 `rst-render` 命令
2. `upload/` 布局与模板路径在 TS 链下可一键复现

### 第 3 步：可选 `@seqyuan/annopi-report`

完成条件：

1. 导出 `buildAnnopiReportContext()` 供 annovibe 内嵌
2. 不重复实现渲染逻辑

### 第 4 步：跨语言 pipeline 共存

完成条件：

1. Python `annopi conf` 生成的 report task shell 可改为调用 `rst-render`（仅改 command 字符串）
2. TS / Python 流程引擎均能 `run` 该 shell

---

## 十二、验收清单

report 方案落地时，满足以下条件即视为完成：

1. 无 annopi-ts 内置 Jinja2 / Sphinx / `template_renderer` 代码
2. 标准报告 task 使用 `rst-render -t`，不依赖 `annopi report`
3. 新模板以 `--scan` + `project.json` 为主；旧 `data.*` 模板可运行
4. 单模块报告可输出 standalone HTML（`-s`）
5. 汇总报告可通过 `--scan modules=report/source/*.rst` 或等价方式生成
6. annovibe / annox 可通过 `import @seqyuan/rst-renderer` 渲染，无需 Python 环境
7. report 任务仍仅通过 `depends` 接入 pipeline，不改变 `tasks.yml` 互操作语义

---

## 十三、结论

annopi-ts 的 report 策略可以概括为：

**编排归 annopi-ts，渲染归 rst。**

- 流程引擎（V1）只管把「调用 `rst-render` 的 shell 命令」排进 DAG 并执行。
- 模板、上下文、RST 解析、HTML 输出全部由 [`../rst`](../../rst) 负责。
- Python 版 `annopi report` 是迁移参照物，不是 TS 版的实现目标。

这样 V1 边界保持干净，report 能力又可与 annovibe / annox 同栈集成，避免在 annopi-ts 内维护第二套模板渲染系统。
