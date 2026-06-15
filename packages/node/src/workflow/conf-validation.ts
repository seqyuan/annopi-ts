import type { ValidationIssue } from '@seqyuan/annopi-core'

export class ConfValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super('Configuration validation failed')
    this.name = 'ConfValidationError'
    this.issues = issues
  }
}

export function formatValidationIssue(issue: ValidationIssue): string {
  switch (issue.level) {
    case 'check':
      return `[CHECK] ${issue.message}`
    case 'warning':
      return `[WARN]  ${issue.message}`
    case 'error':
      return `[ERROR] ${issue.message}`
  }
}

export function printValidationIssues(issues: ValidationIssue[]): void {
  for (const issue of issues) {
    console.log(formatValidationIssue(issue))
  }
}
