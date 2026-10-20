import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LanguageServerActions } from '@/src/components/topbar/language-server-actions.tsx'
import { languageServerById } from '@/src/stories/support/language-server-fixture.ts'

const meta = {
  title: 'Components/Topbar/LanguageServerActions',
  component: LanguageServerActions,
  args: { server: languageServerById('typescript-language-server'), onRun: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'flex items-center gap-1 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof LanguageServerActions>

export default meta

type Story = StoryObj<typeof meta>

export const Install: Story = {}

export const Remove: Story = { args: { server: languageServerById('gopls') } }

export const Update: Story = { args: { server: languageServerById('pyright') } }

export const Retry: Story = { args: { server: languageServerById('intelephense') } }

export const Installing: Story = {
  args: { server: { ...languageServerById('gopls'), status: 'installing' } },
}

export const Blocked: Story = { args: { server: languageServerById('jdtls') } }
