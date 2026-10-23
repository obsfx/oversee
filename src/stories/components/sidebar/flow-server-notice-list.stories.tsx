import type { Meta, StoryObj } from '@storybook/react-vite'
import { CallFlowGraphs } from '@/src/lib/call-flow.ts'
import type { ChangeFlowServer } from '@/src/lib/change-flow-gateway.ts'
import { InMemoryLanguageServerGateway } from '@/src/lib/in-memory-language-server-gateway.ts'
import type { LanguageServerList } from '@/src/lib/language-server-gateway.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { languageServerList } from '@/src/stories/support/language-server-fixture.ts'
import { StoryFlowNotices } from '@/src/stories/support/story-flow-notices.tsx'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const installingList: LanguageServerList = {
  ...languageServerList,
  servers: languageServerList.servers.map((server) => {
    if (server.id !== 'rust-analyzer') {
      return server
    }
    return { ...server, status: 'installing', progress: { received: 6_200_000, total: 18_400_000 } }
  }),
}

const services = createStoryServices({
  languageServers: new InMemoryLanguageServerGateway(installingList),
})

const flowOf = (servers: ChangeFlowServer[]) => {
  return { servers, graph: CallFlowGraphs.empty }
}

const meta = {
  title: 'Components/Sidebar/FlowServerNoticeList',
  component: StoryFlowNotices,
  args: {
    flow: flowOf([
      { server: 'typescript-language-server', status: 'not-installed', error: '' },
      { server: 'jdtls', status: 'not-installed', error: '' },
      { server: 'rust-analyzer', status: 'not-installed', error: '' },
      { server: 'intelephense', status: 'not-installed', error: '' },
      { server: 'gopls', status: 'starting', error: '' },
      { server: 'pyright', status: 'indexing', error: '' },
      {
        server: 'clangd',
        status: 'failed',
        error: 'clangd: exit status 1\nI[12:01:33.120] Failed to find compilation database',
      },
      { server: 'lua-language-server', status: 'unsupported', error: '' },
    ]),
  },
  argTypes: { flow: { table: { disable: true } } },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'w-72 bg-sidebar text-sidebar-fg'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof StoryFlowNotices>

export default meta

type Story = StoryObj<typeof meta>

export const EveryStatus: Story = {}

export const NeedsCheckout: Story = {
  args: {
    flow: flowOf([
      { server: 'typescript-language-server', status: 'needs-checkout', error: '' },
      { server: 'gopls', status: 'needs-checkout', error: '' },
    ]),
  },
}

export const AllReady: Story = {
  args: { flow: flowOf([{ server: 'gopls', status: 'ready', error: '' }]) },
}
