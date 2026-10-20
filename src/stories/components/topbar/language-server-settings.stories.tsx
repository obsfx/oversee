import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LanguageServerSettings } from '@/src/components/topbar/language-server-settings.tsx'
import type { LanguageServerGateway } from '@/src/lib/language-server-gateway.ts'
import type { Services } from '@/src/lib/services.ts'
import {
  createLiveStoryServices,
  createStoryServices,
  neverResolves,
  rejectsWith,
} from '@/src/stories/support/fixtures.ts'
import {
  installingProgress,
  withLanguageServer,
} from '@/src/stories/support/language-server-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const listOnly = (list: LanguageServerGateway['list']): LanguageServerGateway => {
  return {
    list,
    install: () => {
      return neverResolves()
    },
    uninstall: () => {
      return neverResolves()
    },
    cancel: () => {
      return neverResolves()
    },
  }
}

const services = createLiveStoryServices()

const meta = {
  title: 'Components/Topbar/LanguageServerSettings',
  component: LanguageServerSettings,
  args: { navigate: fn() },
  decorators: [
    (Story, context) => {
      const storyServices = (context.parameters.services as Services | undefined) ?? services
      return (
        <StoryFrame services={storyServices}>
          <div className={'flex w-80 flex-col gap-2 rounded-md border border-line bg-popup p-2'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof LanguageServerSettings>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Installing: Story = {
  parameters: {
    services: createLiveStoryServices({
      serverList: withLanguageServer('rust-analyzer', {
        status: 'installing',
        progress: installingProgress,
      }),
    }),
  },
}

export const Loading: Story = {
  parameters: {
    services: createStoryServices({ languageServers: listOnly(neverResolves) }),
  },
}

export const Failed: Story = {
  parameters: {
    services: createStoryServices({
      languageServers: listOnly(rejectsWith('language servers unavailable')),
    }),
  },
}
