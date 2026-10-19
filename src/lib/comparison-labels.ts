import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'

export abstract class ComparisonLabels {
  static of({ source, target }: Comparison) {
    return `${ComparisonRules.sourceLabel(source)} into ${target}`
  }

  static deleted(names: readonly string[]) {
    const verb = names.length === 1 ? 'was' : 'were'
    return `${names.join(' and ')} ${verb} deleted.`
  }

  static showing(comparison: Comparison) {
    return `Showing ${ComparisonLabels.of(comparison)}`
  }
}
