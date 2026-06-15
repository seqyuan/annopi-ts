export type { ProjectConfig } from './model/project'
export type { PipelineConfig, PipelineTaskDef } from './model/pipeline'
export type { TaskStatus, TaskRuntimeState, TasksFile } from './model/tasks-file'

export { parseProjectConfig } from './config/project'
export { parsePipelineConfig } from './config/pipeline'

export {
  collectValidationIssues,
  validateConfigRefs,
  validateDepsDeclared,
  validateSampleRefs,
  validateTaskFormat,
} from './validate/validator'
export type { ValidationIssue, ValidationResult } from './validate/validator'

export {
  CMP_SAMPLES_PATTERN,
  CROSS_REF_PATTERN,
  OPTIONAL_BLOCK_PATTERN,
  PARAM_PATTERN,
} from './resolver/patterns'
export { ParamResolver } from './resolver/param-resolver'
export type { ExpandMode } from './resolver/param-resolver'

export { DAGBuilder } from './dag/builder'
