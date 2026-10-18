const DECIMAL = /^\d+(\.\d+)?$/

export class NumericRange {
  readonly min: number
  readonly max: number

  constructor(min: number, max: number) {
    this.min = min
    this.max = max
  }

  contains(value: unknown): value is number {
    return typeof value === 'number' && value >= this.min && value <= this.max
  }

  valueOr(value: unknown, fallback: number) {
    return this.contains(value) ? value : fallback
  }

  parse(raw: string) {
    const trimmed = raw.trim()
    if (!DECIMAL.test(trimmed)) {
      return null
    }
    const value = Number(trimmed)
    return this.contains(value) ? value : null
  }
}
