import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToolbarDivider } from '@/src/primitives/toolbar-divider.tsx'

const meta = {
  title: 'Primitives/ToolbarDivider',
  component: ToolbarDivider,
  decorators: [
    (Story) => {
      return (
        <div className={'flex items-center text-xs text-fg-muted'}>
          <span>Before</span>
          <Story />
          <span>After</span>
        </div>
      )
    },
  ],
} satisfies Meta<typeof ToolbarDivider>

export default meta

export const Default: StoryObj<typeof meta> = {}
