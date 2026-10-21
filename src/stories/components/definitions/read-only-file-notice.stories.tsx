import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReadOnlyFileNotice } from '@/src/components/definitions/read-only-file-notice.tsx'
import { definitionTabs } from '@/src/stories/support/definition-fixture.ts'

const meta = {
  title: 'Components/Definitions/ReadOnlyFileNotice',
  component: ReadOnlyFileNotice,
  args: { tab: definitionTabs.file },
  decorators: [
    (Story) => {
      return (
        <div className={'w-[44rem] border border-line bg-surface text-fg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ReadOnlyFileNotice>

export default meta

type Story = StoryObj<typeof meta>

export const InRepository: Story = {}

export const External: Story = { args: { tab: definitionTabs.external } }
