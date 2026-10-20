import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorDetails } from '@/src/components/error-details.tsx'

const meta = {
  title: 'Components/ErrorDetails',
  component: ErrorDetails,
  args: {
    error:
      'download https://github.com/example/intelephense.tar.gz: checksum 3f1c does not match 9ab2',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'flex justify-end text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ErrorDetails>

export default meta

export const Default: StoryObj<typeof meta> = {}
