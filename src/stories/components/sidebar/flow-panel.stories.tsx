import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { CallFlowGraphs } from '@/src/lib/call-flow.ts'
import type { ChangeFlow, ChangeFlowServer } from '@/src/lib/change-flow-gateway.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { InMemoryEventStream } from '@/src/lib/in-memory-event-stream.ts'
import { InMemoryLanguageServerGateway } from '@/src/lib/in-memory-language-server-gateway.ts'
import { ChangeFlowFixtures } from '@/src/stories/support/change-flow-fixture.ts'
import {
  FlowBuildSimulation,
  type SimulatedServer,
} from '@/src/stories/support/flow-build-simulation.ts'
import {
  createLiveStoryServices,
  neverResolves,
  rejectsWith,
} from '@/src/stories/support/fixtures.ts'
import { languageServerList } from '@/src/stories/support/language-server-fixture.ts'
import { StoryFlowPanel } from '@/src/stories/support/story-flow-panel.tsx'
import { useComparisonStore } from '@/src/store/comparison-store.ts'
import { useSymbolHighlightStore } from '@/src/store/symbol-highlight-store.ts'

const { oversee, godot } = ChangeFlowFixtures

const flowOf = (servers: ChangeFlowServer[], graph = CallFlowGraphs.empty): ChangeFlow => {
  return { servers, graph }
}

const resolves = (flow: ChangeFlow) => {
  return () => {
    return Promise.resolve(flow)
  }
}

const installServices = () => {
  const events = new InMemoryEventStream()
  const languageServers = new InMemoryLanguageServerGateway(languageServerList, { events })
  return ChangeFlowFixtures.servicesOf(
    oversee,
    {
      events,
      languageServers,
      changeFlows: async () => {
        const list = await languageServers.list()
        const installed = list.servers.some((server) => {
          return server.id === 'typescript-language-server' && server.status === 'installed'
        })
        if (installed) {
          return oversee.flow
        }
        return flowOf([
          { server: 'typescript-language-server', status: 'not-installed', error: '' },
        ])
      },
    },
    createLiveStoryServices,
  )
}

const indexingServices = () => {
  let loads = 0
  return ChangeFlowFixtures.servicesOf(oversee, {
    changeFlows: () => {
      loads += 1
      if (loads < 3) {
        return Promise.resolve(
          flowOf([{ server: 'typescript-language-server', status: 'indexing', error: '' }]),
        )
      }
      return Promise.resolve(oversee.flow)
    },
  })
}

const coldBuild: SimulatedServer[] = [
  { server: 'pyright', startMs: 400, files: 20, readMs: 800, functions: 96, traceMs: 1500 },
  { server: 'gopls', startMs: 900, files: 48, readMs: 1200, functions: 412, traceMs: 3000 },
  {
    server: 'typescript-language-server',
    startMs: 1500,
    files: 112,
    readMs: 2000,
    functions: 1069,
    traceMs: 4500,
  },
]

const rebuildServers: SimulatedServer[] = [
  {
    server: 'typescript-language-server',
    startMs: 0,
    files: 112,
    readMs: 1600,
    functions: 1069,
    traceMs: 4000,
  },
  { server: 'gopls', startMs: 1200, files: 48, readMs: 1000, functions: 412, traceMs: 2400 },
]

const progressServices = () => {
  const events = new InMemoryEventStream()
  const build = new FlowBuildSimulation(events, coldBuild)
  return ChangeFlowFixtures.servicesOf(
    oversee,
    {
      events,
      changeFlows: async (comparison) => {
        await build.run(comparison)
        return oversee.flow
      },
    },
    createLiveStoryServices,
  )
}

const rebuildServices = () => {
  const events = new InMemoryEventStream()
  const build = new FlowBuildSimulation(events, rebuildServers)
  return ChangeFlowFixtures.servicesOf(
    oversee,
    {
      events,
      changeFlows: (comparison) => {
        if (build.finished) {
          return Promise.resolve(
            flowOf(
              [
                { server: 'typescript-language-server', status: 'ready', error: '' },
                { server: 'gopls', status: 'ready', error: '' },
              ],
              oversee.flow.graph,
            ),
          )
        }
        void build.run(comparison)
        return Promise.resolve(
          flowOf(
            [
              { server: 'typescript-language-server', status: 'indexing', error: '' },
              { server: 'gopls', status: 'starting', error: '' },
            ],
            oversee.flow.graph,
          ),
        )
      },
    },
    createLiveStoryServices,
  )
}

const BUILD_TIMEOUT_MS = 12_000

const servicesOf = (...args: Parameters<typeof ChangeFlowFixtures.servicesOf>) => {
  return () => {
    return ChangeFlowFixtures.servicesOf(...args)
  }
}

const meta = {
  title: 'Components/Sidebar/FlowPanel',
  component: StoryFlowPanel,
  parameters: { layout: 'fullscreen' },
  args: { createServices: servicesOf(oversee) },
  argTypes: { createServices: { table: { disable: true } } },
  beforeEach: () => {
    useComparisonStore.setState({ selected: null, notice: null })
    useSymbolHighlightStore.getState().clear()
  },
} satisfies Meta<typeof StoryFlowPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Oversee: Story = {}

export const Godot: Story = { args: { createServices: servicesOf(godot) } }

export const Loading: Story = {
  args: { createServices: servicesOf(oversee, { changeFlows: neverResolves }) },
}

export const Progress: Story = {
  args: { createServices: progressServices },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const progress = await canvas.findByRole('progressbar', { name: 'Call flow progress' })
    await expect(progress).toBeVisible()

    const tracing = await canvas.findByText(/^Tracing calls in /, {}, { timeout: BUILD_TIMEOUT_MS })
    await expect(tracing).toBeVisible()

    const tree = await canvas.findByRole(
      'tree',
      { name: 'Calls between the changed functions' },
      { timeout: BUILD_TIMEOUT_MS },
    )
    await expect(tree).toBeVisible()
    await expect(canvas.queryByRole('progressbar', { name: 'Call flow progress' })).toBeNull()
  },
}

export const Rebuild: Story = {
  args: { createServices: rebuildServices },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tree = await canvas.findByRole('tree', { name: 'Calls between the changed functions' })
    const progress = await canvas.findByRole('progressbar', { name: 'Call flow progress' })
    await expect(progress).toBeVisible()
    await expect(progress.compareDocumentPosition(tree)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    const tracing = await canvas.findByText(
      /^Tracing calls in TypeScript/,
      {},
      { timeout: BUILD_TIMEOUT_MS },
    )
    await expect(tracing).toBeVisible()
    await expect(tree).toBeVisible()

    await waitFor(
      () => {
        return expect(canvas.queryByRole('progressbar', { name: 'Call flow progress' })).toBeNull()
      },
      { timeout: BUILD_TIMEOUT_MS },
    )
    await expect(
      canvas.getByRole('tree', { name: 'Calls between the changed functions' }),
    ).toBeVisible()
  },
}

export const Failed: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: rejectsWith('get-change-flow: request failed'),
    }),
  },
}

export const Empty: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: resolves(
        flowOf([{ server: 'typescript-language-server', status: 'ready', error: '' }]),
      ),
    }),
  },
}

export const InstallServer: Story = { args: { createServices: installServices } }

export const Blocked: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: resolves(flowOf([{ server: 'jdtls', status: 'not-installed', error: '' }])),
    }),
  },
}

export const NeedsCheckout: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: resolves(
        flowOf([
          { server: 'typescript-language-server', status: 'needs-checkout', error: '' },
          { server: 'gopls', status: 'needs-checkout', error: '' },
        ]),
      ),
    }),
  },
  beforeEach: () => {
    useComparisonStore.setState({
      selected: { source: ComparisonRules.branch('feat/comment-threads'), target: 'main' },
      notice: null,
    })
  },
}

export const IndexingThenReady: Story = { args: { createServices: indexingServices } }

export const ServerFailed: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: resolves(
        flowOf(
          [
            { server: 'typescript-language-server', status: 'ready', error: '' },
            {
              server: 'gopls',
              status: 'failed',
              error: 'gopls: exit status 2\ngo: cannot find main module, but found .git/config',
            },
          ],
          oversee.flow.graph,
        ),
      ),
    }),
  },
}

export const Unsupported: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: resolves(
        flowOf([{ server: 'lua-language-server', status: 'unsupported', error: '' }], {
          ...oversee.flow.graph,
          edges: [],
          origins: {},
        }),
      ),
    }),
  },
}

export const Partial: Story = {
  args: {
    createServices: servicesOf(oversee, {
      changeFlows: resolves(
        flowOf(
          [
            { server: 'typescript-language-server', status: 'ready', error: '' },
            { server: 'rust-analyzer', status: 'not-installed', error: '' },
            { server: 'gopls', status: 'indexing', error: '' },
          ],
          oversee.flow.graph,
        ),
      ),
    }),
  },
}
