import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscCheck } from 'react-icons/vsc'
import { MenuItem } from '../../primitives/menu-item.tsx'

const meta = {
  title: 'Primitives/MenuItem',
  component: MenuItem,
  decorators: [
    (Story) => {
      return (
        <div className={'w-48 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: {
    children: (
      <>
        <VscCheck className={'text-reviewed'} />
        Mark as reviewed
      </>
    ),
  },
} satisfies Meta<typeof MenuItem>

export default meta

export const Default: StoryObj<typeof meta> = {}
