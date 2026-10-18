import type { Meta, StoryObj } from '@storybook/react-vite'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { TopbarGroup } from '@/src/primitives/topbar-group.tsx'
import { TopbarShell } from '@/src/primitives/topbar-shell.tsx'

const meta = {
  title: 'Primitives/TopbarShell',
  component: TopbarShell,
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <>
        <TopbarGroup>
          <MutedHint>left group</MutedHint>
        </TopbarGroup>
        <TopbarGroup>
          <MutedHint>right group</MutedHint>
        </TopbarGroup>
      </>
    ),
  },
} satisfies Meta<typeof TopbarShell>

export default meta

export const Default: StoryObj<typeof meta> = {}
