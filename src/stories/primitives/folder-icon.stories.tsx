import type { Meta, StoryObj } from '@storybook/react-vite'
import { FolderIcon } from '@/src/primitives/folder-icon.tsx'

const meta = {
  title: 'Primitives/FolderIcon',
  component: FolderIcon,
  args: { open: false },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FolderIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = { args: { open: true } }
