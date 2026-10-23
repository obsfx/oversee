import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FolderRow } from '@/src/primitives/folder-row.tsx'

const meta = {
  title: 'Primitives/FolderRow',
  component: FolderRow,
  args: {
    depth: 1,
    focused: false,
    expanded: true,
    name: 'components',
    onToggle: fn(),
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FolderRow>

export default meta

type Story = StoryObj<typeof meta>

export const Expanded: Story = {}

export const Collapsed: Story = { args: { expanded: false } }

export const Focused: Story = { args: { focused: true } }

export const Compressed: Story = { args: { depth: 0, name: 'src/graphql/resolvers/AdminUser' } }
