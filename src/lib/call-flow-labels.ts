import type {
  CallFlowChange,
  CallFlowEdge,
  CallFlowKind,
  CallFlowNode,
  CallFlowOrigin,
  CallFlowVia,
} from '@/src/lib/call-flow.ts'
import { LocationLabels } from '@/src/lib/location-labels.ts'

export interface CallFlowViaLabel {
  via: Exclude<CallFlowVia, 'call'>
  text: string
  title: string
}

const KINDS: Record<CallFlowKind, string> = {
  component: 'Component',
  hook: 'Hook',
  function: 'Function',
  method: 'Method',
  callback: 'Engine callback',
  handler: 'Signal handler',
}

const CHANGES: Record<CallFlowChange, string> = {
  added: 'Added',
  modified: 'Modified',
  removed: 'Removed',
}

export abstract class CallFlowLabels {
  static readonly notConnected = 'Not connected'

  static readonly cycle = 'recursive'

  static readonly loading = 'Tracing the changed functions'

  static readonly waiting = 'Waiting for language servers'

  static readonly failed = 'Could not trace the changes'

  static readonly empty = 'No changed functions'

  static readonly noMatch = 'No functions match the filter'

  static readonly filter = 'Filter functions'

  static readonly tree = 'Calls between the changed functions'

  static kind(kind: CallFlowKind) {
    return KINDS[kind]
  }

  static change(change: CallFlowChange) {
    return CHANGES[change]
  }

  static fileLocation(node: CallFlowNode) {
    return LocationLabels.fileLine(node.path, node.line)
  }

  static title(node: CallFlowNode, parent: CallFlowNode | null, edge: CallFlowEdge | null) {
    const title = `${node.name}\n${CallFlowLabels.location(node)}`
    if (parent === null || edge === null) {
      return title
    }
    return `${title}\nCalled at ${parent.path}:${edge.line}`
  }

  static viaOf(edge: CallFlowEdge | null): CallFlowViaLabel | null {
    if (edge === null || edge.via === 'call') {
      return null
    }
    return {
      via: edge.via,
      text: edge.label ?? '',
      title: CallFlowLabels.viaTitle(edge.via, edge.label),
    }
  }

  static origin(origins: readonly CallFlowOrigin[]) {
    const [first] = origins
    if (first === undefined) {
      return ''
    }
    let label = first.name
    if (first.path !== null) {
      label = `from ${first.name}`
    }
    if (origins.length > 1) {
      return `${label} +${origins.length - 1}`
    }
    return label
  }

  static originTitle(origins: readonly CallFlowOrigin[]) {
    return origins
      .map((origin) => {
        if (origin.path === null) {
          return origin.name
        }
        if (origin.line === null) {
          return `${origin.name} ${origin.path}`
        }
        return `${origin.name} ${origin.path}:${origin.line}`
      })
      .join('\n')
  }

  private static location(node: CallFlowNode) {
    return `${node.path}:${node.line}`
  }

  private static viaTitle(via: Exclude<CallFlowVia, 'call'>, label: string | null) {
    if (via === 'signal') {
      return `Runs when ${label ?? 'a signal'} is emitted`
    }
    if (via === 'connect') {
      return `Connects ${label ?? 'a signal'} to this handler`
    }
    return 'Implements the interface method called here'
  }
}
