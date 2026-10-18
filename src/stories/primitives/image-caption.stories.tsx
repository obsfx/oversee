import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImageCaption } from '@/src/primitives/image-caption.tsx'

const meta = {
  title: 'Primitives/ImageCaption',
  component: ImageCaption,
  args: { label: 'Before', tone: 'before', meta: '240 x 140' },
} satisfies Meta<typeof ImageCaption>

export default meta

type Story = StoryObj<typeof meta>

export const Before: Story = {}

export const After: Story = { args: { label: 'After', tone: 'after' } }

export const WithoutSize: Story = { args: { meta: null } }
