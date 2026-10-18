import type { Meta, StoryObj } from '@storybook/react-vite'
import { TooltipProvider } from '@/src/context/tooltip/tooltip-provider.tsx'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'
import { SessionSummary } from '@/src/primitives/session-summary.tsx'

const meta = {
  title: 'Primitives/SessionSummary',
  component: SessionSummary,
  args: {
    leading: <SessionStatusIcon status={'in-progress'} />,
    title: 'Oct 17, 20:08',
    subtitle: 'feat/upgrade-deprecated-versions',
    meta: '3 comments',
  },
  decorators: [
    (Story) => {
      return (
        <TooltipProvider>
          <div className={'flex w-96 text-xs'}>
            <Story />
          </div>
        </TooltipProvider>
      )
    },
  ],
} satisfies Meta<typeof SessionSummary>

export default meta

export const Default: StoryObj<typeof meta> = {}
