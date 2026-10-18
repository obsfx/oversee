export abstract class ValueGuards {
  static isString(value: unknown): value is string {
    return typeof value === 'string'
  }

  static isOptionalString(value: unknown): value is string | undefined {
    return value === undefined || typeof value === 'string'
  }

  static isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
  }

  static isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
  }

  static isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
  }

  static isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
    return options.some((option) => {
      return option === value
    })
  }

  static isListOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is T[] {
    return Array.isArray(value) && value.every(isItem)
  }

  static isStringList(value: unknown): value is string[] {
    return ValueGuards.isListOf(value, ValueGuards.isString)
  }
}
