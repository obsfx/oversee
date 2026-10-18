import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NumericSettingInput } from '../../../components/topbar/numeric-setting-input.tsx'
import { SettingsSchema } from '../../../lib/settings-schema.ts'

const meta = {
  title: 'Components/Topbar/NumericSettingInput',
  component: NumericSettingInput,
  args: {
    label: 'Font size',
    unit: 'px',
    value: 12,
    range: SettingsSchema.fontSizeRange,
    onChange: fn(),
  },
  argTypes: { range: { table: { disable: true } } },
  decorators: [
    (Story) => {
      return (
        <div className={'w-60'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof NumericSettingInput>

export default meta

type Story = StoryObj<typeof meta>

export const FontSize: Story = {}

export const LineHeight: Story = {
  args: {
    label: 'Line height',
    unit: undefined,
    value: 1.6,
    range: SettingsSchema.lineHeightRange,
  },
}
