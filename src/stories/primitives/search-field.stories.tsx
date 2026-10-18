import type { Meta, StoryObj } from '@storybook/react-vite'
import { BareInput } from '../../primitives/bare-input.tsx'
import { SearchField } from '../../primitives/search-field.tsx'

const meta = {
  title: 'Primitives/SearchField',
  component: SearchField,
  args: { children: <BareInput placeholder={'Filter source'} /> },
} satisfies Meta<typeof SearchField>

export default meta

export const Default: StoryObj<typeof meta> = {}
