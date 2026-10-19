import * as v from 'valibot'
import type { BranchList } from '@/src/lib/branch-gateway.ts'

export type ComparisonSource = { kind: 'uncommitted' } | { kind: 'branch'; name: string }

export interface Comparison {
  source: ComparisonSource
  target: string
}

const PREFERRED_TARGETS = ['main', 'master', 'develop']
const UNCOMMITTED_REF = ':uncommitted'

export abstract class ComparisonRules {
  static readonly uncommitted: ComparisonSource = { kind: 'uncommitted' }
  static readonly uncommittedLabel = 'Uncommitted changes'

  static branch(name: string): ComparisonSource {
    return { kind: 'branch', name }
  }

  static isUncommitted(source: ComparisonSource) {
    return source.kind === 'uncommitted'
  }

  static branchName(source: ComparisonSource) {
    return source.kind === 'branch' ? source.name : null
  }

  static defaultFor({ branches, current }: BranchList): Comparison {
    const target =
      PREFERRED_TARGETS.find((branch) => {
        return branches.includes(branch)
      }) ?? current
    return { source: ComparisonRules.uncommitted, target }
  }

  static key({ source, target }: Comparison) {
    const sourceKey = source.kind === 'branch' ? `branch:${source.name}` : 'uncommitted'
    return `${sourceKey}..${target}`
  }

  static query({ source, target }: Comparison) {
    return { source: ComparisonRules.branchName(source) ?? UNCOMMITTED_REF, target }
  }

  static fromQuery(source: string, target: string): Comparison {
    if (source === UNCOMMITTED_REF) {
      return { source: ComparisonRules.uncommitted, target }
    }
    return { source: ComparisonRules.branch(source), target }
  }

  static searchParams(comparison: Comparison) {
    return new URLSearchParams(ComparisonRules.query(comparison))
  }

  static readonly wireSchema = v.pipe(
    v.object({ source: v.string(), target: v.string() }),
    v.transform(({ source, target }) => {
      return ComparisonRules.fromQuery(source, target)
    }),
  )

  static sourceLabel(source: ComparisonSource) {
    return ComparisonRules.branchName(source) ?? ComparisonRules.uncommittedLabel
  }
}
