import * as v from 'valibot'

const DECIMAL = /^\d+(\.\d+)?$/

export class NumericRange {
  readonly min: number
  readonly max: number
  private readonly bounds: v.GenericSchema<number>

  constructor(min: number, max: number) {
    this.min = min
    this.max = max
    this.bounds = v.pipe(v.number(), v.minValue(min), v.maxValue(max))
  }

  schemaOr(fallback: number) {
    return v.fallback(this.bounds, fallback)
  }

  parse(raw: string) {
    const trimmed = raw.trim()
    if (!DECIMAL.test(trimmed)) {
      return null
    }
    const value = Number(trimmed)
    return v.is(this.bounds, value) ? value : null
  }
}
