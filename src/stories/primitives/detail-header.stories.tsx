import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VscTrash } from 'react-icons/vsc'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import { Button } from '@/src/primitives/button.tsx'
import { DetailHeader } from '@/src/primitives/detail-header.tsx'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'
import { SessionSummary } from '@/src/primitives/session-summary.tsx'

const meta = {
  title: 'Primitives/DetailHeader',
  component: DetailHeader,
  args: {
    backLabel: 'Back to sessions',
    onBack: fn(),
    children: (
      <SessionSummary
        leading={<SessionStatusIcon status={'created'} />}
        title={'Oct 18, 17:08'}
        subtitle={'feat/upgrade-deprecated-versions'}
        meta={'2 comments'}
      />
    ),
  },
  decorators: [
    (Story) => {
      return (
        <TooltipProvider>
          <div className={'w-96 border border-line text-xs'}>
            <Story />
          </div>
        </TooltipProvider>
      )
    },
  ],
} satisfies Meta<typeof DetailHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Session: Story = {}

export const WithAction: Story = {
  args: {
    backLabel: 'Back to current comments',
    children: (
      <>
        <span className={'font-medium'}>Outdated</span>
        <span className={'text-fg-faint tabular-nums'}>2</span>
        <Button variant={'ghost'} className={'ml-auto'}>
          <VscTrash />
          Delete all
        </Button>
      </>
    ),
  },
}
