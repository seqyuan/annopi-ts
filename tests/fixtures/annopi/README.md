# annopi 测试 fixtures（来自 ../annopi）

这些文件从 Python 版 annopi 测试目录同步而来，用于 annopi-ts 流程测试：

- `pipeline.yml` — scRNA 双任务流程（cellranger qsubsge + qc local）
- `pipeline_with_deps.yml` — `${deps.*}` 引用测试
- `project.yml` — 3 个样本 + cmp 配置

对应 Python 测试：

- `../annopi/tests/test_e2e.py`
- `../annopi/tests/test_conf_integration.py`
- `../annopi/tests/test_run_integration.py`

TypeScript 端到端测试：

- `packages/node/tests/workflow/e2e-conf-run.test.ts`
- `packages/cli/tests/workflow.test.ts`
