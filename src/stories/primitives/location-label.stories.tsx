import type { Meta, StoryObj } from '@storybook/react-vite'
import { LocationLabel } from '@/src/primitives/location-label.tsx'

const meta = {
  title: 'Primitives/LocationLabel',
  component: LocationLabel,
  args: {
    external: false,
    name: 'session.repository.ts:8',
    directory: 'src/stories/support',
    title: 'src/stories/support/session.repository.ts',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-72 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof LocationLabel>

export default meta

type Story = StoryObj<typeof meta>

export const InRepository: Story = {}

export const External: Story = {
  args: {
    external: true,
    name: 'lib.es5.d.ts:10',
    directory: '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib',
    title: '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib/lib.es5.d.ts',
  },
}

export const LongName: Story = {
  args: {
    external: true,
    name: 'user-notification-preferences.controller.spec.ts:1284',
    directory: 'C:\\Users\\aleksandra\\go\\pkg\\mod\\github.com\\coder\\websocket@v1.8.12',
    title: 'C:\\Users\\aleksandra\\go\\pkg\\mod\\github.com\\coder\\websocket@v1.8.12\\conn.go',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-64'}>
          <Story />
        </div>
      )
    },
  ],
}
