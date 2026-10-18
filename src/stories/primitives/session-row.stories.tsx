import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import { SessionRow } from '@/src/primitives/session-row.tsx'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'
import { SessionSummary } from '@/src/primitives/session-summary.tsx'

const meta = {
  title: 'Primitives/SessionRow',
  component: SessionRow,
  args: {
    onSelect: fn(),
    children: (
      <SessionSummary
        leading={<SessionStatusIcon status={'closed'} />}
        title={'Oct 12, 20:08'}
        subtitle={'feat/comment-threads'}
        meta={'1 comment'}
      />
    ),
  },
  decorators: [
    (Story) => {
      return (
        <TooltipProvider>
          <div className={'w-96 text-xs'}>
            <Story />
          </div>
        </TooltipProvider>
      )
    },
  ],
} satisfies Meta<typeof SessionRow>

export default meta

export const Default: StoryObj<typeof meta> = {}
