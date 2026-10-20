import type { Meta, StoryObj } from '@storybook/react-vite'
import { Footnote } from '@/src/primitives/footnote.tsx'

const meta = {
  title: 'Primitives/Footnote',
  component: Footnote,
  args: { children: 'Installed in ~/.oversee/lsp and shared by every workspace' },
} satisfies Meta<typeof Footnote>

export default meta

export const Default: StoryObj<typeof meta> = {}
