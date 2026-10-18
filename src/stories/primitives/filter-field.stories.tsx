import type { Meta, StoryObj } from '@storybook/react-vite'
import { BareInput } from '../../primitives/bare-input.tsx'
import { FilterField } from '../../primitives/filter-field.tsx'

const meta = {
  title: 'Primitives/FilterField',
  component: FilterField,
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-64 bg-sidebar text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: { children: <BareInput placeholder={'Filter files'} className={'text-xs'} /> },
} satisfies Meta<typeof FilterField>

export default meta

export const Default: StoryObj<typeof meta> = {}
