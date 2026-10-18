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

  static defaultFor({ branches, current }: BranchList): Comparison | null {
    if (!branches.includes(current)) {
      return null
    }
    const others = branches.filter((branch) => {
      return branch !== current
    })
    const target =
      PREFERRED_TARGETS.find((branch) => {
        return others.includes(branch)
      }) ??
      others[0] ??
      current
    return { source: ComparisonRules.branch(current), target }
  }

  static key({ source, target }: Comparison) {
    const sourceKey = source.kind === 'branch' ? `branch:${source.name}` : 'uncommitted'
    return `${sourceKey}..${target}`
  }

  static query({ source, target }: Comparison) {
    return { source: source.kind === 'branch' ? source.name : UNCOMMITTED_REF, target }
  }

  static searchParams(comparison: Comparison) {
    return new URLSearchParams(ComparisonRules.query(comparison))
  }

  static sourceLabel(source: ComparisonSource) {
    return source.kind === 'uncommitted' ? ComparisonRules.uncommittedLabel : source.name
  }
}
