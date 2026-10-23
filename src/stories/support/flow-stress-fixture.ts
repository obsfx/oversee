import type {
  CallFlowChange,
  CallFlowEdge,
  CallFlowGraph,
  CallFlowKind,
  CallFlowNode,
  CallFlowOrigin,
  CallFlowVia,
} from '@/src/lib/call-flow.ts'
import { CallFlowGraphs } from '@/src/lib/call-flow.ts'
import type { ChangeFlow, ChangeFlowServer } from '@/src/lib/change-flow-gateway.ts'
import { ChangeFlowFixtures } from '@/src/stories/support/change-flow-fixture.ts'
import type { StressData } from '@/src/stories/support/definition-stress-fixture.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'

const DEEP_FOLDER = 'src/features/review/sessions/comments/locations/openers/focus/restore'

const LONG_NAME = 'useReviewSessionCommentLocationOpenerWithFocusRestoreAndScrollIntoViewFallback'

const LONG_SIGNAL = 'player_health_changed_after_damage_and_shield_absorption_finished'

const LONG_ERROR = [
  'typescript-language-server: exit status 1',
  ...Array.from({ length: 40 }, (_, index) => {
    return `    at TypeScriptServer.request (/Users/dev/.oversee/lsp/typescript-language-server/4.3.3/node_modules/typescript-language-server/lib/cli.mjs:${1200 + index}:17)`
  }),
].join('\n')

class GraphBuilder {
  readonly nodes: CallFlowNode[] = []
  readonly edges: CallFlowEdge[] = []
  readonly origins: Record<string, CallFlowOrigin[]> = {}
  private line = 1

  node(
    name: string,
    path: string,
    kind: CallFlowKind = 'function',
    change: CallFlowChange = 'modified',
  ) {
    const line = this.line
    this.line += 7
    const node: CallFlowNode = {
      id: `${path}#${line}`,
      name,
      kind,
      path,
      line,
      endLine: line + 5,
      change,
    }
    this.nodes.push(node)
    return node
  }

  removed(name: string, path: string) {
    const node = this.node(name, path, 'method')
    node.change = 'removed'
    return node
  }

  call(
    from: CallFlowNode,
    to: CallFlowNode,
    via: CallFlowVia = 'call',
    label: string | null = null,
  ) {
    this.edges.push({ from: from.id, to: to.id, line: from.line + 1, via, label })
  }

  origin(node: CallFlowNode, origins: CallFlowOrigin[]) {
    this.origins[node.id] = origins
  }

  graph(): CallFlowGraph {
    return { nodes: this.nodes, edges: this.edges, origins: this.origins }
  }
}

const ready = (server: string): ChangeFlowServer => {
  return { server, status: 'ready', error: '' }
}

const worst = (): ChangeFlow => {
  const graph = new GraphBuilder()
  const entry = graph.node(LONG_NAME, `${DEEP_FOLDER}/${LONG_NAME}.ts`, 'hook')
  graph.origin(
    entry,
    Array.from({ length: 14 }, (_, index) => {
      return {
        name: `ReviewSessionCommentLocationOpenerHost${index}`,
        path: `${DEEP_FOLDER}/hosts/review-session-comment-location-opener-host-${index}.tsx`,
        line: 100 + index,
      }
    }),
  )
  let previous = entry
  for (let depth = 0; depth < 40; depth += 1) {
    const next = graph.node(
      `${LONG_NAME}Step${depth}`,
      `${DEEP_FOLDER}/steps/step-${depth}/${LONG_NAME}-step-${depth}.ts`,
    )
    graph.call(previous, next)
    previous = next
  }
  const cycleEntry = graph.node(
    'ReviewSessionReconciler.start',
    'src/lib/review-session-reconciler.ts',
    'method',
  )
  const cycleA = graph.node(
    'ReviewSessionReconciler.reconcile',
    'src/lib/review-session-reconciler.ts',
    'method',
  )
  const cycleB = graph.node(
    'ReviewSessionReconciler.placeComment',
    'src/lib/review-session-reconciler.ts',
    'method',
  )
  const cycleC = graph.node(
    'ReviewSessionReconciler.retryLater',
    'src/lib/review-session-reconciler.ts',
    'method',
  )
  graph.call(cycleEntry, cycleA)
  graph.call(cycleA, cycleB)
  graph.call(cycleB, cycleC)
  graph.call(cycleC, cycleA)
  const emitter = graph.node(
    'Player.take_damage_and_apply_shield_absorption',
    'scenes/player/player.gd',
    'method',
  )
  const handler = graph.node(
    'Hud._on_player_health_changed_after_damage_and_shield_absorption_finished',
    'scenes/ui/hud.gd',
    'handler',
  )
  const hudReady = graph.node('Hud._ready', 'scenes/ui/hud.gd', 'callback')
  graph.call(emitter, handler, 'signal', LONG_SIGNAL)
  graph.call(hudReady, handler, 'connect', LONG_SIGNAL)
  graph.origin(hudReady, [
    { name: 'engine calls it when the node enters the tree', path: null, line: null },
  ])
  const port = graph.node('ChangeFlowGateway.load', 'src/lib/change-flow-gateway.ts', 'method')
  const adapter = graph.node(
    'HttpChangeFlowGatewayWithRetriesAndValibotSchemaValidation.load',
    'src/lib/http-change-flow-gateway.ts',
    'method',
  )
  graph.call(entry, port)
  graph.call(entry, adapter, 'implementation')
  const scripts = [
    [`\u51e6\u7406\u3059\u308b`, `src/\u65e5\u672c\u8a9e/\u51e6\u7406.ts`],
    [
      `\u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c\u0417\u0430\u043f\u0440\u043e\u0441`,
      `src/\u0440\u0443\u0441\u0441\u043a\u0438\u0439/\u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430.ts`,
    ],
    [
      `\u0645\u0639\u0627\u0644\u062c\u0629\u0627\u0644\u0637\u0644\u0628`,
      `src/\u0639\u0631\u0628\u064a/\u0645\u0639\u0627\u0644\u062c\u0629.ts`,
    ],
  ] as const
  for (const [name, path] of scripts) {
    graph.call(entry, graph.node(name, path))
  }
  for (let index = 0; index < 60; index += 1) {
    const root = graph.node(
      `EntryPoint${index}With${LONG_NAME.slice(0, 20)}`,
      `src/entries/entry-${index}.ts`,
    )
    graph.call(root, graph.node(`calledFromEntry${index}`, `src/entries/entry-${index}.ts`))
  }
  for (let index = 0; index < 40; index += 1) {
    graph.node(`looseFunction${index}`, `src/loose/${'nested/'.repeat(index % 6)}loose-${index}.ts`)
  }
  graph.removed(
    `Player._legacy_roll_with_a_very_long_name_${'x'.repeat(40)}`,
    'scenes/player/player.gd',
  )
  return {
    servers: [
      ready('typescript-language-server'),
      { server: 'rust-analyzer', status: 'not-installed', error: '' },
      { server: 'jdtls', status: 'not-installed', error: '' },
      { server: 'gopls', status: 'starting', error: '' },
      { server: 'pyright', status: 'indexing', error: '' },
      { server: 'clangd', status: 'failed', error: LONG_ERROR },
      { server: 'lua-language-server', status: 'unsupported', error: '' },
      { server: 'zls', status: 'needs-checkout', error: '' },
    ],
    graph: graph.graph(),
  }
}

const many = (): ChangeFlow => {
  const graph = new GraphBuilder()
  const layers: CallFlowNode[][] = []
  for (let layer = 0; layer < 6; layer += 1) {
    layers.push(
      Array.from({ length: 80 }, (_, index) => {
        return graph.node(
          `layer${layer}Function${index}`,
          `src/layer-${layer}/module-${index % 12}.ts`,
        )
      }),
    )
  }
  for (let layer = 0; layer < layers.length - 1; layer += 1) {
    layers[layer].forEach((node, index) => {
      const below = layers[layer + 1]
      graph.call(node, below[(index * 7) % below.length])
      graph.call(node, below[(index * 13 + 5) % below.length])
    })
  }
  return { servers: [ready('typescript-language-server')], graph: graph.graph() }
}

const one = (): ChangeFlow => {
  const graph = new GraphBuilder()
  graph.node('useCallFlow', 'src/hooks/use-call-flow.ts', 'hook', 'added')
  return { servers: [ready('typescript-language-server')], graph: graph.graph() }
}

const builders: Record<StressData, () => ChangeFlow> = {
  demo: () => {
    return ChangeFlowFixtures.oversee.flow
  },
  worst,
  empty: () => {
    return { servers: [ready('typescript-language-server')], graph: CallFlowGraphs.empty }
  },
  one,
  many,
}

export const flowStressServices = (data: StressData) => {
  const flow = builders[data]()
  return ChangeFlowFixtures.servicesOf(
    ChangeFlowFixtures.oversee,
    {
      changeFlows: () => {
        return Promise.resolve(flow)
      },
    },
    createLiveStoryServices,
  )
}
