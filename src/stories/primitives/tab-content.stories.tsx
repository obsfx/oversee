import type { Meta, StoryObj } from '@storybook/react-vite'
import { TabContent } from '@/src/primitives/tab-content.tsx'

const meta = {
  title: 'Primitives/TabContent',
  component: TabContent,
  args: {
    tabbed: true,
    label: 'session.repository.ts',
    children: <div className={'p-3 text-xs text-fg-muted'}>Active tab content</div>,
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex h-40 w-96 flex-col border border-line'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TabContent>

export default meta

type Story = StoryObj<typeof meta>

export const Tabbed: Story = {}

export const WithoutTabs: Story = { args: { tabbed: false } }
