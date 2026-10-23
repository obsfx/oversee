import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CallStackRow } from '@/src/primitives/call-stack-row.tsx'
import { ViaLabel } from '@/src/primitives/via-label.tsx'

const meta = {
  title: 'Primitives/CallStackRow',
  component: CallStackRow,
  args: {
    depth: 2,
    selected: false,
    marked: false,
    expandable: true,
    expanded: true,
    onToggle: fn(),
    onClick: fn(),
    last: false,
    continues: [true],
    kind: 'hook',
    change: 'modified',
    name: 'useFileDiff',
    location: 'use-file-diff.ts:12',
  },
  decorators: [
    (Story) => {
      return (
        <div role={'tree'} className={'w-80 bg-sidebar py-1'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof CallStackRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = { args: { selected: true } }

export const MarkedFile: Story = { args: { marked: true } }

export const Collapsed: Story = { args: { expanded: false } }

export const EntryPoint: Story = {
  args: {
    depth: 0,
    continues: [],
    kind: 'component',
    name: 'TabPanel',
    location: 'tab-panel.tsx:9',
  },
}

export const Removed: Story = {
  args: {
    expandable: false,
    kind: 'method',
    change: 'removed',
    name: 'Player._legacy_roll',
    location: 'player.gd:58',
  },
}

export const Recursive: Story = { args: { expandable: false, cycle: true } }

export const Signal: Story = {
  args: {
    kind: 'handler',
    change: 'added',
    name: 'Hud._on_stamina_changed',
    location: 'hud.gd:30',
    via: (
      <ViaLabel
        via={'signal'}
        text={'stamina_changed'}
        title={'Runs when stamina_changed is emitted'}
      />
    ),
  },
}

export const LongNames: Story = {
  args: {
    depth: 5,
    continues: [true, false, true, true],
    name: 'useReviewSessionCommentLocationOpenerWithFocusRestore',
    location: 'use-review-session-comment-location-opener-with-focus-restore.ts:1204',
  },
}
