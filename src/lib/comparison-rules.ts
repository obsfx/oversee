import * as v from 'valibot'
import type { BranchList } from '@/src/lib/branch-gateway.ts'

export type ComparisonSource = { kind: 'uncommitted' } | { kind: 'branch'; name: string }

export interface Comparison {
  source: ComparisonSource
  target: string
}

export interface ComparisonReplacement {
  comparison: Comparison
  deleted: string[]
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

  static replaceMissing(comparison: Comparison, list: BranchList): ComparisonReplacement | null {
    const known = new Set([...list.branches, ...list.remoteBranches, list.current])
    const deleted: string[] = []
    let { source, target } = comparison
    const sourceName = ComparisonRules.branchName(source)
    if (sourceName !== null && !known.has(sourceName)) {
      deleted.push(sourceName)
      source = ComparisonRules.uncommitted
    }
    if (!known.has(target)) {
      deleted.push(target)
      target = ComparisonRules.defaultFor(list).target
    }
    if (deleted.length === 0) {
      return null
    }
    return { comparison: { source, target }, deleted }
  }

  static resolve(selected: Comparison | null, list: BranchList | null) {
    if (selected) {
      return selected
    }
    return list ? ComparisonRules.defaultFor(list) : null
  }

  static key({ source, target }: Comparison) {
    const sourceKey = source.kind === 'branch' ? `branch:${source.name}` : 'uncommitted'
    return `${sourceKey}..${target}`
  }

  static fileKey(comparison: Comparison, path: string) {
    return `${ComparisonRules.key(comparison)}:${path}`
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
