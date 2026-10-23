import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TreeFilter } from '@/src/components/sidebar/tree-filter.tsx'

const meta = {
  title: 'Components/Sidebar/TreeFilter',
  component: TreeFilter,
  args: { label: 'Filter files', value: '', onChange: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-72 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TreeFilter>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const WithValue: Story = { args: { value: 'resolvers' } }
