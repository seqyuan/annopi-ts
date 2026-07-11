# annopi-ts

TypeScript rewrite of [annopi](https://github.com/seqyuan/annopi) — a bioinformatics pipeline workflow engine.

Parse `pipeline.yml` and `project.yml`, expand parameters, build a task DAG, generate `shell/*.sh` and `tasks.yml`, then execute pipelines with `.sign` checkpoint/resume. Compatible with Python annopi configs and `tasks.yml` output.

## Install

Requires **Node.js ≥ 18**.

```bash
npm install -g @seqyuan/annopi
```

Or with pnpm:

```bash
pnpm add -g @seqyuan/annopi
```

Verify:

```bash
annopi --help
```

## Usage

annopi-ts uses a two-step workflow: **`conf`** generates scripts and `tasks.yml`; **`run`** executes pending tasks.

### Generate scripts (`conf`)

```bash
annopi conf \
  -p pipeline.yml \
  -c project.yml \
  -o /path/to/outdir
```

This writes:

```
<outdir>/
├── shell/
│   ├── 1-0-taskname.sh
│   └── ...
└── tasks.yml
```

### Execute pipeline (`run`)

```bash
annopi run -o /path/to/outdir
```

Completed tasks create a `.sign` file under `shell/`. Re-running `annopi run` skips tasks that are already done.

### Install task modules

```bash
annopi install <git-url-or-local-path>
annopi install <source> --update
```

## Example

The repo ships fixtures copied from Python annopi (see [tests/fixtures/annopi/README.md](./tests/fixtures/annopi/README.md)):

```bash
annopi conf \
  -p tests/fixtures/annopi/pipeline.yml \
  -c tests/fixtures/annopi/project.yml \
  -o /tmp/annopi-out

annopi run -o /tmp/annopi-out
```

## Packages

| Package | Description |
|---------|-------------|
| `@seqyuan/annopi-core` | Pure models, parsers, validators, param resolver, DAG |
| `@seqyuan/annopi-node` | File I/O, module loading, generators, runtime |
| `@seqyuan/annopi` | Command-line interface (`annopi` binary) |
| `@seqyuan/annopi-extension` | TypeScript API for annovibe / OpenVibe integration |
| `@seqyuan/annopi-report` | Report helpers (depends on [`rst`](https://github.com/seqyuan/rst)) |

### Report (`rst` public packages)

Report rendering is delegated to the published [rst](https://github.com/seqyuan/rst) packages — not bundled into annopi core:

| Package | Description |
|---------|-------------|
| `@seqyuan/rst-renderer` | Template engine + RST → HTML / Markdown / React |
| `@seqyuan/rst-cli` | `rst-render` CLI for report pipeline tasks |

```bash
npm install @seqyuan/annopi-report
# optional CLI for shell-based report tasks
npm install -g @seqyuan/rst-cli
```

## Development

Clone the monorepo and install dependencies:

```bash
git clone https://github.com/seqyuan/annopi-ts.git
cd annopi-ts
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

To use the `annopi` command from a local build (without publishing to npm):

```bash
cd packages/cli
npm link
cd ../..
annopi conf -p ... -c ... -o ...
```

## Documentation

- **Documentation site** — `pnpm site:dev`, then open [http://localhost:3000](http://localhost:3000) (Chinese: [/zh](http://localhost:3000/zh))
- [Rewrite plan V2.1](./docs/annopi-ts-rewrite-plan-v2.1.md)
- [Report design](./docs/annopi-report-design.md) — reports use [`rst`](https://github.com/seqyuan/rst), not Python Jinja2 + Sphinx

## Scope (V1)

- `annopi conf` / `annopi run` / `annopi install`
- Python ↔ TypeScript interoperability
- Report rendering is **not** included in V1
