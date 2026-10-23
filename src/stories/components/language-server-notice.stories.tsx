import type { Meta, StoryObj } from '@storybook/react-vite'
import { LanguageServerNotice } from '@/src/components/language-server-notice.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import {
  installingProgress,
  withLanguageServer,
} from '@/src/stories/support/language-server-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useLanguageServerStore } from '@/src/store/language-server-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

interface NoticeParameters {
  path: string
  services: Services
}

const meta = {
  title: 'Components/LanguageServerNotice',
  component: LanguageServerNotice,
  beforeEach: (context) => {
    const { path } = context.parameters as NoticeParameters
    useNavigationStore.setState({ selectedPath: path })
    useSettingsStore.setState({ dismissedLanguageServers: [] })
    useLanguageServerStore.setState({ readyId: null, requestFailures: new Map() })
  },
  decorators: [
    (Story, context) => {
      const { services } = context.parameters as NoticeParameters
      return (
        <StoryFrame services={services}>
          <div className={'w-[44rem] border border-line bg-surface'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof LanguageServerNotice>

export default meta

type Story = StoryObj<typeof meta>

export const Offer: Story = {
  parameters: { path: 'scripts/expire_password.ts', services: createLiveStoryServices() },
}

export const MissingRequirement: Story = {
  parameters: { path: 'src/main/java/App.java', services: createLiveStoryServices() },
}

export const NoBuild: Story = {
  parameters: { path: 'native/lib.c', services: createLiveStoryServices() },
}

export const Installing: Story = {
  parameters: {
    path: 'scripts/expire_password.ts',
    services: createLiveStoryServices({
      serverList: withLanguageServer('typescript-language-server', {
        status: 'installing',
        progress: installingProgress,
      }),
    }),
  },
}

export const Failed: Story = {
  parameters: { path: 'public/index.php', services: createLiveStoryServices() },
}

export const Installed: Story = {
  parameters: { path: 'cmd/main.go', services: createLiveStoryServices() },
}

export const NoServer: Story = {
  parameters: { path: '.github/workflows/production-ci.yml', services: createLiveStoryServices() },
}
