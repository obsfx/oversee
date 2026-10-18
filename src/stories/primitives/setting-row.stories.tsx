import type { Meta, StoryObj } from '@storybook/react-vite'
import { BareInput } from '../../primitives/bare-input.tsx'
import { InputFrame } from '../../primitives/input-frame.tsx'
import { SettingRow } from '../../primitives/setting-row.tsx'

const meta = {
  title: 'Primitives/SettingRow',
  component: SettingRow,
  args: {
    label: 'Font size',
    children: (
      <InputFrame invalid={false} suffix={'px'}>
        <BareInput defaultValue={'12'} />
      </InputFrame>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-60'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SettingRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithError: Story = {
  args: {
    error: 'Enter a value between 8 and 32',
    children: (
      <InputFrame invalid suffix={'px'}>
        <BareInput defaultValue={'50'} />
      </InputFrame>
    ),
  },
}
