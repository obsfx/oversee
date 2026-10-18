import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileSummary } from '../../../components/toolbar/file-summary.tsx'

const meta = {
  title: 'Components/Toolbar/FileSummary',
  component: FileSummary,
  args: {
    file: {
      path: 'src/modules/auth/session.service.ts',
      status: 'modified',
      additions: 42,
      deletions: 17,
    },
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex items-center gap-1 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FileSummary>

export default meta

type Story = StoryObj<typeof meta>

export const Modified: Story = {}

export const Added: Story = {
  args: { file: { path: '.env.template', status: 'added', additions: 116, deletions: 0 } },
}
