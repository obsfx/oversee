import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import { SessionDetailHeader } from '@/src/primitives/session-detail-header.tsx'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'
import { SessionSummary } from '@/src/primitives/session-summary.tsx'

const meta = {
  title: 'Primitives/SessionDetailHeader',
  component: SessionDetailHeader,
  args: {
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
} satisfies Meta<typeof SessionDetailHeader>

export default meta

export const Default: StoryObj<typeof meta> = {}
