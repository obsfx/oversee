import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VscCloudDownload, VscError, VscInfo, VscWarning } from 'react-icons/vsc'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'
import { SidebarNotice } from '@/src/primitives/sidebar-notice.tsx'
import { Spinner } from '@/src/primitives/spinner.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'

const meta = {
  title: 'Primitives/SidebarNotice',
  component: SidebarNotice,
  args: {
    tone: 'accent',
    icon: <VscCloudDownload />,
    title: 'typescript-language-server is not installed',
    detail: 'Install it to trace TypeScript, JavaScript',
    children: <TextButton onClick={fn()}>Install</TextButton>,
  },
  argTypes: {
    icon: { table: { disable: true } },
    progress: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 bg-sidebar text-sidebar-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SidebarNotice>

export default meta

type Story = StoryObj<typeof meta>

export const Offer: Story = {}

export const Blocked: Story = {
  args: {
    tone: 'warning',
    icon: <VscWarning />,
    title: 'jdtls is not installed',
    detail: 'Needs java on PATH',
    children: undefined,
  },
}

export const Installing: Story = {
  args: {
    title: 'Installing typescript-language-server',
    detail: '6.2 MB of 18.4 MB',
    busy: true,
    progress: <ProgressBar label={'Installing'} ratio={0.34} />,
    children: <TextButton onClick={fn()}>Cancel</TextButton>,
  },
}

export const Failed: Story = {
  args: {
    tone: 'danger',
    icon: <VscError />,
    title: 'gopls failed',
    detail: 'gopls: exit status 2: go: cannot find main module',
    children: <TextButton onClick={fn()}>Retry</TextButton>,
  },
}

export const Waiting: Story = {
  args: {
    tone: 'neutral',
    icon: <Spinner />,
    title: 'typescript-language-server is indexing',
    detail: 'The flow updates when it is ready',
    busy: true,
    children: undefined,
  },
}

export const TitleOnly: Story = {
  args: {
    tone: 'neutral',
    icon: <VscInfo />,
    title: 'lua-language-server lists no calls',
    detail: '',
    children: undefined,
  },
}
