import type { Meta, StoryObj } from '@storybook/react-vite'
import { SymbolKindIcon } from '@/src/primitives/symbol-kind-icon.tsx'

const meta = {
  title: 'Primitives/SymbolKindIcon',
  component: SymbolKindIcon,
  args: { kind: 'component' },
  argTypes: {
    kind: {
      control: 'inline-radio',
      options: ['component', 'hook', 'function', 'method', 'callback', 'handler'],
    },
  },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SymbolKindIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Component: Story = {}

export const Hook: Story = { args: { kind: 'hook' } }

export const Function: Story = { args: { kind: 'function' } }

export const Method: Story = { args: { kind: 'method' } }

export const Callback: Story = { args: { kind: 'callback' } }

export const Handler: Story = { args: { kind: 'handler' } }
