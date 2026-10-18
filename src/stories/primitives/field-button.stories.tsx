import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscChevronDown } from 'react-icons/vsc'
import { FieldButton } from '../../primitives/field-button.tsx'

const meta = {
  title: 'Primitives/FieldButton',
  component: FieldButton,
  args: {
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
