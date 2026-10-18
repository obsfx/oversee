import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextButton } from '@/src/primitives/text-button.tsx'

const meta = {
  title: 'Primitives/TextButton',
  component: TextButton,
  args: { children: 'Mark all read' },
  decorators: [
    (Story) => {
      return (
        <div className={'text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TextButton>

export default meta

export const Default: StoryObj<typeof meta> = {}
