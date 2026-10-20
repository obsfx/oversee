import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RemoveLanguageServerButton } from '@/src/components/topbar/remove-language-server-button.tsx'
import { languageServerById } from '@/src/stories/support/language-server-fixture.ts'

const meta = {
  title: 'Components/Topbar/RemoveLanguageServerButton',
  component: RemoveLanguageServerButton,
  args: { server: languageServerById('gopls'), onRemove: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'flex justify-end text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof RemoveLanguageServerButton>

export default meta

export const Default: StoryObj<typeof meta> = {}
