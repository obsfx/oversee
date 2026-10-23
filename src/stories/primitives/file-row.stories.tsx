import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { FileRow } from '@/src/primitives/file-row.tsx'

const meta = {
  title: 'Primitives/FileRow',
  component: FileRow,
  args: {
    depth: 2,
    selected: false,
    focused: false,
    reviewed: false,
    kind: 'react',
    status: 'modified',
    name: 'file-tab-view.tsx',
    additions: 19,
    deletions: 6,
    countsTitle: '19 lines added, 6 removed',
    'aria-label': 'file-tab-view.tsx, Modified, 19 lines added, 6 removed',
    title: 'src/components/definitions/file-tab-view.tsx, modified',
    onClick: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'w-72 bg-sidebar py-1'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof FileRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = { args: { selected: true } }

export const Focused: Story = { args: { focused: true } }

export const Reviewed: Story = { args: { reviewed: true } }

export const Added: Story = {
  args: {
    kind: 'typescript',
    status: 'added',
    name: 'comment-locations.ts',
    additions: 30,
    deletions: 0,
    'aria-label': 'comment-locations.ts, Added, 30 lines added, 0 removed',
  },
}

export const Deleted: Story = {
  args: {
    kind: 'yaml',
    status: 'deleted',
    name: 'staging-ci.yml',
    additions: 0,
    deletions: 42,
    'aria-label': 'staging-ci.yml, Deleted, 0 lines added, 42 removed',
  },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole('treeitem')
    await expect(row).toHaveAccessibleName('staging-ci.yml, Deleted, 0 lines added, 42 removed')
  },
}

export const Renamed: Story = {
  args: {
    kind: 'go',
    status: 'renamed',
    name: 'workspace_watcher.go',
    additions: 4,
    deletions: 2,
    'aria-label': 'workspace_watcher.go, Renamed, 4 lines added, 2 removed',
    title: 'internal/service/workspace_watcher.go, renamed from internal/service/watcher.go',
  },
}

export const Untracked: Story = {
  args: {
    kind: 'gdscript',
    status: 'untracked',
    name: 'dash_trail.gd',
    additions: 58,
    deletions: 0,
    'aria-label': 'dash_trail.gd, Untracked, 58 lines added, 0 removed',
  },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole('treeitem')
    await expect(row).toHaveAccessibleName('dash_trail.gd, Untracked, 58 lines added, 0 removed')
  },
}

export const ReviewedDeleted: Story = {
  args: {
    reviewed: true,
    kind: 'yaml',
    status: 'deleted',
    name: 'staging-ci.yml',
    additions: 0,
    deletions: 42,
    'aria-label': 'staging-ci.yml, Deleted, 0 lines added, 42 removed',
  },
}

export const LongName: Story = {
  args: {
    depth: 6,
    name: 'use-review-session-comment-location-opener-with-focus-restore.ts',
    kind: 'typescript',
    'aria-label':
      'use-review-session-comment-location-opener-with-focus-restore.ts, Modified, 19 lines added, 6 removed',
  },
}
