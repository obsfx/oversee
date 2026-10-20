import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LanguageServerRow } from '@/src/components/topbar/language-server-row.tsx'
import {
  installingProgress,
  languageServerById,
  languageServerList,
} from '@/src/stories/support/language-server-fixture.ts'

const meta = {
  title: 'Components/Topbar/LanguageServerRow',
  component: LanguageServerRow,
  args: {
    server: languageServerById('typescript-language-server'),
    platform: languageServerList.platform,
    expanded: false,
    failure: null,
    onToggle: fn(),
    onRun: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof LanguageServerRow>

export default meta

type Story = StoryObj<typeof meta>

export const NotInstalled: Story = {}

export const Installed: Story = { args: { server: languageServerById('gopls') } }

export const UpdateAvailable: Story = { args: { server: languageServerById('pyright') } }

export const Installing: Story = {
  args: {
    server: {
      ...languageServerById('typescript-language-server'),
      status: 'installing',
      progress: installingProgress,
    },
  },
}

export const InstallingWithoutSize: Story = {
  args: {
    server: {
      ...languageServerById('gopls'),
      status: 'installing',
      progress: null,
      installedVersion: '',
    },
  },
}

export const Failed: Story = { args: { server: languageServerById('intelephense') } }

export const FailedExpanded: Story = {
  args: { server: languageServerById('intelephense'), expanded: true },
}

export const MissingRequirement: Story = { args: { server: languageServerById('jdtls') } }

export const NoBuild: Story = { args: { server: languageServerById('clangd') } }

export const RequestFailed: Story = {
  args: { failure: 'Install request failed with status 409' },
}
