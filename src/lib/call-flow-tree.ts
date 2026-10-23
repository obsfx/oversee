import type { CallFlowEdge, CallFlowNode, CallFlowOrigin } from '@/src/lib/call-flow.ts'

export interface CallFlowNodeRow {
  type: 'node'
  key: string
  parentKey: string | null
  depth: number
  node: CallFlowNode
  edge: CallFlowEdge | null
  parent: CallFlowNode | null
  expandable: boolean
  expanded: boolean
  cycle: boolean
  repeat: boolean
}

export interface CallFlowGroupRow {
  type: 'group'
  key: string
  parentKey: null
  depth: number
  count: number
  expandable: boolean
  expanded: boolean
}

export interface CallFlowOriginRow {
  type: 'origin'
  key: string
  parentKey: string
  depth: number
  origins: CallFlowOrigin[]
  expandable: false
  expanded: false
}

export type CallFlowRow = CallFlowNodeRow | CallFlowGroupRow | CallFlowOriginRow

export interface CallFlowConnector {
  last: boolean
  continues: boolean[]
}

export interface CallFlowTreeOptions {
  collapsed: ReadonlySet<string>
  opened: ReadonlySet<string>
}

export interface CallFlowFilter {
  matches: ReadonlySet<string>
  leadsToMatch: ReadonlySet<string> | null
}

export interface CallFlowOpenWalk extends CallFlowFilter {
  firstKeys: ReadonlyMap<string, string>
  expandableKeys: readonly string[]
}

export interface CallFlowIndex {
  byId: Map<string, CallFlowNode>
  outgoing: Map<string, CallFlowEdge[]>
  incoming: Map<string, CallFlowEdge[]>
}

export interface CallFlowLayout {
  index: CallFlowIndex
  connected: CallFlowNode[]
  unreached: CallFlowNode[]
  loose: CallFlowNode[]
}
