import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TabResourceView } from '@/src/components/definitions/tab-resource-view.tsx'

const meta = {
  title: 'Components/Definitions/TabResourceView',
  component: TabResourceView<string>,
  args: {
    state: { status: 'ready', data: 'export const answer = 42' },
    failure: 'Could not read this file',
    onRetry: fn(),
    children: (data: string) => {
      return <pre className={'p-3 font-editor text-xs'}>{data}</pre>
    },
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      return (
        <div className={'h-48 bg-surface'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof TabResourceView<string>>

export default meta

type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Loading: Story = { args: { state: { status: 'loading' } } }

export const Failed: Story = {
  args: { state: { status: 'failed', error: new Error('not found') } },
}
