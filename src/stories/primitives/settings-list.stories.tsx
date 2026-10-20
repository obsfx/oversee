import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsList } from '@/src/primitives/settings-list.tsx'

const meta = {
  title: 'Primitives/SettingsList',
  component: SettingsList,
  args: {
    children: Array.from({ length: 30 }, (_, index) => {
      return (
        <div key={index} className={'px-1.5 py-1'}>
          Row {index + 1}
        </div>
      )
    }),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SettingsList>

export default meta

export const Scrolling: StoryObj<typeof meta> = {}
