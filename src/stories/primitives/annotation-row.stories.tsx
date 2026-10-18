import type { Meta, StoryObj } from '@storybook/react-vite'
import { AnnotationRow } from '@/src/primitives/annotation-row.tsx'
import { Button } from '@/src/primitives/button.tsx'

const meta = {
  title: 'Primitives/AnnotationRow',
  component: AnnotationRow,
  args: {
    children: (
      <>
        <Button variant={'accent-subtle'}>Comment on lines 12-18</Button>
        <Button variant={'ghost'}>Clear</Button>
      </>
    ),
  },
} satisfies Meta<typeof AnnotationRow>

export default meta

export const Default: StoryObj<typeof meta> = {}
