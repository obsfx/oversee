import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortcutHint } from '@/src/components/shortcut-hint.tsx'
import { Button } from '@/src/primitives/button.tsx'
import { ComposerFooter } from '@/src/primitives/composer-footer.tsx'

const meta = {
  title: 'Primitives/ComposerFooter',
  component: ComposerFooter,
  args: {
    hint: (
      <>
        <ShortcutHint keys={['mod', 'enter']} label={'to send'} />
        <ShortcutHint keys={['escape']} label={'to cancel'} />
      </>
    ),
    children: (
      <>
        <Button variant={'ghost'}>Cancel</Button>
        <Button variant={'accent-subtle'}>Comment</Button>
      </>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ComposerFooter>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithError: Story = { args: { error: 'Could not save the comment. Try again.' } }
