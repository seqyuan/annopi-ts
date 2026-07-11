/**
 * Report integration for annopi-ts.
 *
 * Rendering is delegated to the published rst packages from
 * https://github.com/seqyuan/rst — use `rst-render` in pipeline tasks
 * or import from this package in Node services.
 */
export {
  renderRst,
  renderRstTemplate,
  renderTemplate,
} from '@seqyuan/rst-renderer'
export type { TemplateContext } from '@seqyuan/rst-renderer'
