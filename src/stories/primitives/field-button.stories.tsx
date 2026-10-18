import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscChevronDown } from 'react-icons/vsc'
import { FieldButton } from '@/src/primitives/field-button.tsx'

const meta = {
  title: 'Primitives/FieldButton',
  component: FieldButton,
  args: {
    className: 'w-36',
    children: (
      <>
        <span className={'truncate'}>JetBrains Mono</span>
        <VscChevronDown className={'text-fg-faint'} />
      </>
    ),
  },
} satisfies Meta<typeof FieldButton>

export default meta

export const Default: StoryObj<typeof meta> = {}
