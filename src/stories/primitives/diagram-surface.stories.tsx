import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiagramSurface } from '@/src/primitives/diagram-surface.tsx'

const meta = {
  title: 'Primitives/DiagramSurface',
  component: DiagramSurface,
  args: { ref: null },
  decorators: [
    (Story) => {
      return (
        <div className={'comment-prose w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof DiagramSurface>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const WithFallback: Story = {
  args: {
    fallback: (
      <pre>
        <code>{'flowchart LR\n  A -->'}</code>
      </pre>
    ),
  },
}
