import { describe, expect, it } from 'vitest'
import type { ResourceState } from '@/src/lib/async-resource.ts'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import { CallFlowGraphs, type CallFlowGraph } from '@/src/lib/call-flow.ts'
import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { FlowProgress } from '@/src/lib/flow-progress.ts'
import { FlowPanelStates } from '@/src/lib/flow-panel-states.ts'
import type { FlowServerNotice, FlowServerNoticeKind } from '@/src/lib/flow-server-notices.ts'
import { languageServerList } from '@/src/stories/support/language-server-fixture.ts'

const graph: CallFlowGraph = {
  nodes: [
    {
      id: 'main',
      name: 'runMain',
      kind: 'function',
      path: 'src/main.ts',
      line: 1,
      endLine: 5,
      change: 'modified',
    },
  ],
  edges: [],
  origins: {},
}

const ready = (nodes: CallFlowGraph = graph): ResourceState<ChangeFlow> => {
  return { status: 'ready', data: { servers: [], graph: nodes } }
}

const readyEmpty = ready(CallFlowGraphs.empty)

const notice = (kind: FlowServerNoticeKind): FlowServerNotice => {
  return { kind, key: kind, server: kind, languageServer: null, error: '' }
}

const notices = (...kinds: FlowServerNoticeKind[]) => {
  return kinds.map(notice)
}

const progress: FlowProgress = {
  comparison: { source: ComparisonRules.uncommitted, target: 'main' },
  servers: [{ server: 'typescript-language-server', phase: 'tracing', done: 412, total: 1069 }],
}

describe('FlowPanelStates.contentOf', () => {
  it('shows progress while the flow is idle or loading', () => {
    expect(FlowPanelStates.contentOf({ status: 'idle' }, [])).toBe('progress')
    expect(FlowPanelStates.contentOf({ status: 'loading' }, [])).toBe('progress')
  })

  it('shows the failure of a failed request', () => {
    const failed: ResourceState<ChangeFlow> = { status: 'failed', error: new Error('boom') }

    expect(FlowPanelStates.contentOf(failed, notices('indexing'))).toBe('failed')
  })

  it('shows the tree whenever the graph has nodes, even while servers trace', () => {
    expect(FlowPanelStates.contentOf(ready(), [])).toBe('tree')
    expect(FlowPanelStates.contentOf(ready(), notices('indexing', 'offer'))).toBe('tree')
  })

  it('keeps showing progress for an empty graph while a server is pending', () => {
    expect(FlowPanelStates.contentOf(readyEmpty, notices('starting'))).toBe('progress')
    expect(FlowPanelStates.contentOf(readyEmpty, notices('indexing', 'offer'))).toBe('progress')
    expect(FlowPanelStates.contentOf(readyEmpty, notices('installing'))).toBe('progress')
  })

  it('shows the notices when they explain an empty graph', () => {
    expect(FlowPanelStates.contentOf(readyEmpty, notices('offer'))).toBe('notices')
    expect(FlowPanelStates.contentOf(readyEmpty, notices('needs-checkout'))).toBe('notices')
    expect(FlowPanelStates.contentOf(readyEmpty, notices('failed', 'unsupported'))).toBe('notices')
  })

  it('is empty when nothing explains an empty graph', () => {
    expect(FlowPanelStates.contentOf(readyEmpty, [])).toBe('empty')
    expect(FlowPanelStates.contentOf(readyEmpty, notices('unsupported'))).toBe('empty')
  })
})

describe('FlowPanelStates.progressOf', () => {
  it('shows the loading line before any progress arrives', () => {
    expect(FlowPanelStates.progressOf({ status: 'loading' }, [], null, null)).toEqual({
      ratio: null,
      phase: CallFlowLabels.loading,
    })
  })

  it('shows the phase of the progress while loading', () => {
    const line = FlowPanelStates.progressOf({ status: 'loading' }, [], progress, languageServerList)

    expect(line?.phase).toBe('Tracing calls in TypeScript, 412 of 1069 functions')
    expect(line?.ratio).toBeCloseTo(0.3 + 0.7 * (412 / 1069))
  })

  it('waits for language servers when an empty flow is still pending', () => {
    expect(FlowPanelStates.progressOf(readyEmpty, notices('starting'), null, null)).toEqual({
      ratio: null,
      phase: CallFlowLabels.waiting,
    })
  })

  it('shows the line above a tree while a server is starting or indexing', () => {
    for (const kind of ['starting', 'indexing'] as const) {
      const line = FlowPanelStates.progressOf(ready(), notices(kind), progress, languageServerList)
      expect(line?.phase).toBe('Tracing calls in TypeScript, 412 of 1069 functions')
    }
    expect(FlowPanelStates.progressOf(ready(), notices('indexing'), null, null)).toEqual({
      ratio: null,
      phase: CallFlowLabels.waiting,
    })
  })

  it('hides the line above a settled tree', () => {
    expect(FlowPanelStates.progressOf(ready(), [], progress, languageServerList)).toBeNull()
    expect(
      FlowPanelStates.progressOf(ready(), notices('installing', 'failed'), progress, null),
    ).toBeNull()
  })

  it('hides the line for failed, notices and empty content', () => {
    const failed: ResourceState<ChangeFlow> = { status: 'failed', error: new Error('boom') }

    expect(FlowPanelStates.progressOf(failed, [], progress, null)).toBeNull()
    expect(FlowPanelStates.progressOf(readyEmpty, notices('offer'), progress, null)).toBeNull()
    expect(FlowPanelStates.progressOf(readyEmpty, [], progress, null)).toBeNull()
  })
})
