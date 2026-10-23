import type {
  CallFlowEdge,
  CallFlowGraph,
  CallFlowNode,
  CallFlowOrigin,
} from '@/src/lib/call-flow.ts'
import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import type { Services } from '@/src/lib/services.ts'
import type { WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'
import { createStoryServices, type StoryServicesOptions } from '@/src/stories/support/fixtures.ts'
import { FlowFixtureFiles, type FlowFixtureFile } from '@/src/stories/support/flow-fixture-files.ts'
import { GodotFlowFixture } from '@/src/stories/support/godot-flow-fixture.ts'
import overseeFlowSource from '@/src/stories/support/oversee-flow.json?raw'

export interface ChangeFlowDataset {
  id: string
  workspace: WorkspaceInfo
  files: FlowFixtureFile[]
  flow: ChangeFlow
}

interface ProbeFixture {
  files: FlowFixtureFile[]
  nodes: CallFlowNode[]
  edges: Pick<CallFlowEdge, 'from' | 'to' | 'line'>[]
  origins: Record<string, string[]>
}

export abstract class ChangeFlowFixtures {
  static readonly oversee = ChangeFlowFixtures.probe()

  static readonly godot: ChangeFlowDataset = {
    id: 'godot',
    workspace: { name: 'dash-knight', path: '/Users/dev/games/dash-knight' },
    files: GodotFlowFixture.files,
    flow: {
      servers: [{ server: 'gdscript', status: 'ready', error: '' }],
      graph: GodotFlowFixture.graph(),
    },
  }

  static changesOf(dataset: ChangeFlowDataset) {
    return FlowFixtureFiles.changeSet(dataset.files).changes
  }

  static servicesOf(
    dataset: ChangeFlowDataset,
    options: StoryServicesOptions = {},
    create: (options: StoryServicesOptions) => Services = createStoryServices,
  ) {
    const changeSet = FlowFixtureFiles.changeSet(dataset.files)
    return create({
      workspace: () => {
        return Promise.resolve(dataset.workspace)
      },
      changeSets: () => {
        return Promise.resolve(changeSet)
      },
      fileDiffs: (request) => {
        return Promise.resolve(FlowFixtureFiles.diff(dataset.id, dataset.files, request))
      },
      changeFlows: () => {
        return Promise.resolve(dataset.flow)
      },
      comments: [],
      sessions: [],
      notifications: [],
      ...options,
    })
  }

  private static probe(): ChangeFlowDataset {
    const fixture = JSON.parse(overseeFlowSource) as ProbeFixture
    const ids = new Map<string, string>()
    const nodes = fixture.nodes.map((node) => {
      const id = `${node.path}#${node.line}`
      ids.set(node.id, id)
      return { ...node, id }
    })
    const idOf = (probeId: string) => {
      return ids.get(probeId) ?? probeId
    }
    const graph: CallFlowGraph = {
      nodes,
      edges: fixture.edges.map((edge) => {
        return {
          from: idOf(edge.from),
          to: idOf(edge.to),
          line: edge.line,
          via: 'call',
          label: null,
        }
      }),
      origins: {},
    }
    for (const [probeId, callers] of Object.entries(fixture.origins)) {
      const origins = callers.flatMap((caller) => {
        return ChangeFlowFixtures.callerOf(caller)
      })
      if (origins.length > 0) {
        graph.origins[idOf(probeId)] = origins
      }
    }
    return {
      id: 'oversee',
      workspace: { name: 'oversee', path: '/Users/dev/studio-2/oversee' },
      files: fixture.files,
      flow: {
        servers: [{ server: 'typescript-language-server', status: 'ready', error: '' }],
        graph,
      },
    }
  }

  private static callerOf(caller: string): CallFlowOrigin[] {
    const match = /^(.+) \((.+)\)$/.exec(caller)
    if (match === null) {
      return [{ name: caller, path: null, line: null }]
    }
    const [, name, path] = match
    if (path.includes('/stories/') || path.includes('/alternatives/')) {
      return []
    }
    return [{ name, path, line: null }]
  }
}
