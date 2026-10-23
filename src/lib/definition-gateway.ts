import * as v from 'valibot'
import type { FileSide } from '@/src/lib/change-set.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

const STATUSES = [
  'ready',
  'unsupported',
  'not-installed',
  'needs-checkout',
  'starting',
  'indexing',
  'failed',
] as const

export type DefinitionStatus = (typeof STATUSES)[number]

export interface DefinitionQuery {
  comparison: Comparison
  side: FileSide
  path: string
  line: number
  character: number
}

interface DefinitionSnippet {
  startLine: number
  lines: string[]
}

export interface Definition {
  path: string
  external: boolean
  side: FileSide
  line: number
  snippet: DefinitionSnippet
}

export interface DefinitionLookup {
  status: DefinitionStatus
  server: string
  error: string
  definitions: Definition[]
}

export interface DefinitionGateway {
  find(query: DefinitionQuery): Promise<DefinitionLookup>
}

export abstract class DefinitionQueries {
  static of(
    comparison: Comparison,
    { side, path, line, character }: Omit<DefinitionQuery, 'comparison'>,
  ): DefinitionQuery {
    return { comparison, side, path, line, character }
  }

  static key({ comparison, side, path, line, character }: DefinitionQuery) {
    return `${ComparisonRules.key(comparison)}::${side}::${path}::${line}:${character}`
  }
}

export abstract class DefinitionShapes {
  static readonly status = v.picklist(STATUSES)

  static readonly definition = v.object({
    path: v.string(),
    external: v.fallback(v.boolean(), false),
    side: v.picklist(['old', 'new']),
    line: ValueSchemas.positiveInteger,
    snippet: v.object({
      startLine: ValueSchemas.positiveInteger,
      lines: v.array(v.string()),
    }),
  })

  static readonly lookup = v.object({
    status: DefinitionShapes.status,
    server: v.fallback(v.string(), ''),
    error: v.fallback(v.string(), ''),
    definitions: v.fallback(v.array(DefinitionShapes.definition), []),
  })
}
