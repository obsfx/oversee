import type { CallFlowEdge, CallFlowNode } from '@/src/lib/call-flow.ts'
import type { FileSide } from '@/src/lib/change-set.ts'
import type { SymbolHighlight } from '@/src/lib/symbol-highlight.ts'

export interface CallFlowNavigationPort {
  revealLine(path: string, side: FileSide, line: number): void
  highlight(highlight: SymbolHighlight): void
}

export interface CallFlowStep {
  node: CallFlowNode
  edge: CallFlowEdge | null
  parent: CallFlowNode | null
}

export interface CallFlowTarget {
  path: string
  side: FileSide
  line: number
  highlight: SymbolHighlight
}

export class CallFlowNavigation {
  private readonly port: CallFlowNavigationPort

  constructor(port: CallFlowNavigationPort) {
    this.port = port
  }

  static targetOf({ node, edge, parent }: CallFlowStep): CallFlowTarget {
    if (edge !== null && parent !== null && parent.change !== 'removed') {
      return {
        path: parent.path,
        side: 'new',
        line: edge.line,
        highlight: {
          path: parent.path,
          side: 'new',
          start: parent.line,
          end: parent.endLine,
          focus: edge.line,
        },
      }
    }
    let side: FileSide = 'new'
    if (node.change === 'removed') {
      side = 'old'
    }
    return {
      path: node.path,
      side,
      line: node.line,
      highlight: { path: node.path, side, start: node.line, end: node.endLine, focus: node.line },
    }
  }

  open(step: CallFlowStep) {
    const target = CallFlowNavigation.targetOf(step)
    this.port.highlight(target.highlight)
    this.port.revealLine(target.path, target.side, target.line)
  }
}
