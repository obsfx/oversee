import * as v from 'valibot'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

const KINDS = ['component', 'hook', 'function', 'method', 'callback', 'handler'] as const

const CHANGES = ['added', 'modified', 'removed'] as const

const VIAS = ['call', 'implementation', 'signal', 'connect'] as const

export type CallFlowKind = (typeof KINDS)[number]

export type CallFlowChange = (typeof CHANGES)[number]

export type CallFlowVia = (typeof VIAS)[number]

export interface CallFlowNode {
  id: string
  name: string
  kind: CallFlowKind
  path: string
  line: number
  endLine: number
  change: CallFlowChange
}

export interface CallFlowEdge {
  from: string
  to: string
  line: number
  via: CallFlowVia
  label: string | null
}

export interface CallFlowOrigin {
  name: string
  path: string | null
  line: number | null
}

export interface CallFlowGraph {
  nodes: CallFlowNode[]
  edges: CallFlowEdge[]
  origins: Record<string, CallFlowOrigin[]>
}

export abstract class CallFlowGraphs {
  static readonly empty: CallFlowGraph = { nodes: [], edges: [], origins: {} }
}

export abstract class CallFlowShapes {
  static readonly node = v.object({
    id: v.string(),
    name: v.string(),
    kind: v.picklist(KINDS),
    path: v.string(),
    line: ValueSchemas.positiveInteger,
    endLine: ValueSchemas.positiveInteger,
    change: v.picklist(CHANGES),
  })

  static readonly edge = v.object({
    from: v.string(),
    to: v.string(),
    line: ValueSchemas.positiveInteger,
    via: v.picklist(VIAS),
    label: v.nullable(v.string()),
  })

  static readonly origin = v.object({
    name: v.string(),
    path: v.nullable(v.string()),
    line: v.nullable(ValueSchemas.positiveInteger),
  })
}
