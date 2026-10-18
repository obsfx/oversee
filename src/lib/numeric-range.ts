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

  parse(raw: string) {
    const trimmed = raw.trim()
    if (!DECIMAL.test(trimmed)) {
      return null
    }
    const value = Number(trimmed)
    return this.contains(value) ? value : null
  }
}
