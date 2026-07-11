# Changelog

## 0.1.3

### Changes

- Add `@seqyuan/annopi-report` with dependencies on published `@seqyuan/rst-renderer` and `@seqyuan/rst-cli` (from [rst](https://github.com/seqyuan/rst))

## 0.1.2

### Fixes

- Run Python annopi compatibility tests via `python3 -m annopi.cli.main` to avoid PATH clash with the `@seqyuan/annopi` CLI in pnpm workspaces

## 0.1.1

### Changes

- Rename CLI package to `@seqyuan/annopi` for simpler global install
- Implement `createAnnopiExtension()` for annovibe / OpenVibe integration
- Add Python ↔ TypeScript compatibility tests (`py-conf-ts-run`, `ts-conf-py-run`)
- Add GitHub Actions for CI and npm publish
- Rewrite README and documentation site install/usage guides

## 0.1.0

### Changes

- Initial TypeScript rewrite scaffold with pnpm monorepo (`core`, `node`, `cli`, `extension`)
- `annopi conf` / `annopi run` / `annopi install` CLI commands
- ParamResolver (single / sample / cmp), validator, DAG builder
- TasksYmlGenerator with global runner path resolution (`deps.ata`, `deps.annotask`)
- Local mode: `{runner} -i script -l N -t M` without `local` subcommand
- qsubsge mode: `{annotask} qsubsge -i script ...`
- `.sign` checkpoint/resume runtime
- Documentation site (fumadocs + Next.js, en/zh i18n)
