import type { Meta, StoryObj } from '@storybook/react-vite'
import { BareInput } from '../../primitives/bare-input.tsx'
import { InputFrame } from '../../primitives/input-frame.tsx'

const meta = {
  title: 'Primitives/InputFrame',
  component: InputFrame,
  args: { invalid: false, suffix: 'px', children: <BareInput defaultValue={'12'} /> },
} satisfies Meta<typeof InputFrame>

export default meta

type Story = StoryObj<typeof meta>

export const Valid: Story = {}

export const Invalid: Story = {
  args: { invalid: true, children: <BareInput defaultValue={'50'} /> },
}

export const WithoutSuffix: Story = { args: { suffix: undefined } }
