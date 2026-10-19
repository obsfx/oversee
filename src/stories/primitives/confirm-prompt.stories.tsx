import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/src/primitives/button.tsx'
import { ConfirmPrompt } from '@/src/primitives/confirm-prompt.tsx'

const meta = {
  title: 'Primitives/ConfirmPrompt',
  component: ConfirmPrompt,
  args: {
    title: 'Finish this review?',
    description: '4 comments will move to Sessions.',
    children: (
      <>
        <Button variant={'ghost'}>Cancel</Button>
        <Button variant={'accent-subtle'}>Finish review</Button>
      </>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-64 rounded-md border border-line bg-popup text-xs text-fg shadow-lg'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ConfirmPrompt>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TitleOnly: Story = {
  args: {
    title: 'Unmark 12 reviewed files?',
    description: undefined,
    children: (
      <>
        <Button variant={'ghost'}>Cancel</Button>
        <Button variant={'accent-subtle'}>Unmark all</Button>
      </>
    ),
  },
}

export const Failed: Story = { args: { error: 'Could not finish the review. Try again.' } }
