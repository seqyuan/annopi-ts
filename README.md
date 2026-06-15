# annopi-ts

TypeScript rewrite of [annopi](../annopi) — a bioinformatics pipeline workflow engine.

## Scope (V1)

- Parse `pipeline.yml` / `project.yml`
- Expand parameters, build DAG, generate `shell/*.sh` and `tasks.yml`
- Execute pipelines via `.sign` checkpoint/resume
- CLI: `annopi conf`, `annopi run`, `annopi install`
- Python ↔ TypeScript interoperability

Report rendering is **not** part of V1. See [docs/annopi-report-design.md](./docs/annopi-report-design.md) — reports use [`../rst`](../rst), not Python Jinja2 + Sphinx.

## Packages

| Package | Description |
|---------|-------------|
| `@seqyuan/annopi-core` | Pure models, parsers, validators, param resolver, DAG |
| `@seqyuan/annopi-node` | File I/O, module loading, generators, runtime |
| `@seqyuan/annopi-cli` | Command-line interface |
| `@seqyuan/annopi-extension` | Extension API placeholder for annovibe |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

### 流程测试（使用 ../annopi fixtures）

```bash
# 跑全部测试（含 e2e）
pnpm test

# 手动 conf + run
node packages/cli/dist/cli.js conf \
  -p tests/fixtures/annopi/pipeline.yml \
  -c tests/fixtures/annopi/project.yml \
  -o /tmp/annopi-out

node packages/cli/dist/cli.js run -o /tmp/annopi-out
```

fixtures 说明见 [tests/fixtures/annopi/README.md](./tests/fixtures/annopi/README.md)。

## Documentation

- **Documentation site** — `pnpm site:dev` then open [http://localhost:3000](http://localhost:3000) (Chinese: `/zh`)
- [Rewrite plan V2.1](./docs/annopi-ts-rewrite-plan-v2.1.md)
- [Report design](./docs/annopi-report-design.md)
