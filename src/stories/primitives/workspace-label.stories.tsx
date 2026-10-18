import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorkspaceLabel } from '@/src/primitives/workspace-label.tsx'

const meta = {
  title: 'Primitives/WorkspaceLabel',
  component: WorkspaceLabel,
  args: { name: 'now-api' },
} satisfies Meta<typeof WorkspaceLabel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RepoSubdirectory: Story = {
  args: { name: 'now-api', repoName: 'storyvine' },
}

export const LongName: Story = {
  args: { name: 'storyvine-platform-graphql-gateway-service', repoName: 'storyvine-monorepo' },
}
