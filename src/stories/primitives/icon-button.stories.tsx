import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscComment, VscSettingsGear } from 'react-icons/vsc'
import { IconButton } from '../../primitives/icon-button.tsx'

const meta = {
  title: 'Primitives/IconButton',
  component: IconButton,
  args: { title: 'Settings', children: <VscSettingsGear /> },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

export const IconOnly: Story = {}

export const WithCount: Story = {
  args: {
    title: 'Comments',
    children: (
      <>
        <VscComment />
        <span className={'text-xs'}>4</span>
      </>
    ),
  },
}
