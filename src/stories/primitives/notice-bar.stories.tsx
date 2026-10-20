import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscCheck, VscError, VscGoToFile, VscWarning } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { NoticeBar } from '@/src/primitives/notice-bar.tsx'
import { ProgressBar } from '@/src/primitives/progress-bar.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'

const meta = {
  title: 'Primitives/NoticeBar',
  component: NoticeBar,
  decorators: [
    (Story) => {
      return (
        <div className={'w-[44rem] border border-line bg-surface text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    tone: 'accent',
    icon: <VscGoToFile />,
    title: 'Go to definition for .ts files',
    detail: 'Install typescript-language-server 6.0.2, needs node and npm',
    children: (
      <>
        <TextButton onClick={fn()}>Install</TextButton>
        <TextButton onClick={fn()}>Not now</TextButton>
      </>
    ),
  },
} satisfies Meta<typeof NoticeBar>

export default meta

type Story = StoryObj<typeof meta>

export const Accent: Story = {}

export const Warning: Story = {
  args: {
    tone: 'warning',
    icon: <VscWarning />,
    title: 'feat/comment-threads was deleted.',
    detail: 'Showing Uncommitted changes into main',
    children: <TextButton onClick={fn()}>Dismiss</TextButton>,
  },
}

export const Danger: Story = {
  args: {
    tone: 'danger',
    icon: <VscError />,
    title: 'intelephense did not install',
    detail: 'download https://github.com/example/intelephense.tar.gz: checksum 3f1c does not match',
    children: <TextButton onClick={fn()}>Retry</TextButton>,
  },
}

export const Success: Story = {
  args: {
    tone: 'success',
    icon: <VscCheck />,
    title: 'Go to definition is ready for .ts files',
    detail: 'Hold Command and click a symbol',
    children: undefined,
  },
}

export const WithProgress: Story = {
  args: {
    title: 'Installing rust-analyzer',
    detail: '6.2 MB of 18.4 MB',
    busy: true,
    progress: <ProgressBar label={'Installing rust-analyzer'} ratio={0.34} />,
    children: undefined,
  },
}

export const LongDetail: Story = {
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
}
