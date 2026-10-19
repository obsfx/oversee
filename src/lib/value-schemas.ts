import * as v from 'valibot'

export abstract class ValueSchemas {
  static readonly count = v.pipe(v.number(), v.integer(), v.minValue(0))
  static readonly positiveInteger = v.pipe(v.number(), v.integer(), v.minValue(1))
}
