import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CallFlowRowView } from '@/src/components/sidebar/call-flow-row-view.tsx'
import type { CallFlowGraph } from '@/src/lib/call-flow.ts'
import { CallFlowConnectors } from '@/src/lib/call-flow-connectors.ts'
import { CallFlowLayouts } from '@/src/lib/call-flow-layouts.ts'
import { CallFlowOpenWalks } from '@/src/lib/call-flow-open-walks.ts'
import { CallFlowRows } from '@/src/lib/call-flow-rows.ts'
import type { CallFlowRow } from '@/src/lib/call-flow-tree.ts'
import { TreeKeys } from '@/src/lib/tree-keys.ts'

const graph: CallFlowGraph = {
  nodes: [
    {
      id: 'tab-panel#TabPanel',
      name: 'TabPanel',
      kind: 'component',
      path: 'src/components/definitions/tab-panel.tsx',
      line: 9,
      endLine: 35,
      change: 'modified',
    },
    {
      id: 'diff-viewer#DiffViewer',
      name: 'DiffViewer',
      kind: 'component',
      path: 'src/components/diff-viewer/diff-viewer.tsx',
      line: 13,
      endLine: 60,
      change: 'modified',
    },
    {
      id: 'use-file-diff#useFileDiff',
      name: 'useFileDiff',
      kind: 'hook',
      path: 'src/hooks/use-file-diff.ts',
      line: 13,
      endLine: 61,
      change: 'modified',
    },
    {
      id: 'diff-line-reveal#isInHunk',
      name: 'DiffLineReveal.isInHunk',
      kind: 'method',
      path: 'src/lib/diff-line-reveal.ts',
      line: 47,
      endLine: 55,
      change: 'added',
    },
    {
      id: 'file-tab-view#FileTabView',
      name: 'FileTabView',
      kind: 'component',
      path: 'src/components/definitions/file-tab-view.tsx',
      line: 9,
      endLine: 29,
      change: 'modified',
    },
    {
      id: 'stamina#consume',
      name: 'Stamina.consume',
      kind: 'method',
      path: 'scripts/components/stamina.gd',
      line: 18,
      endLine: 23,
      change: 'added',
    },
    {
      id: 'hud#_on_stamina_changed',
      name: 'Hud._on_stamina_changed',
      kind: 'handler',
      path: 'scenes/ui/hud.gd',
      line: 18,
      endLine: 19,
      change: 'added',
    },
    {
      id: 'hud#_ready',
      name: 'Hud._ready',
      kind: 'callback',
      path: 'scenes/ui/hud.gd',
      line: 10,
      endLine: 14,
      change: 'modified',
    },
    {
      id: 'http-gateway#load',
      name: 'HttpChangeFlowGateway.load',
      kind: 'method',
      path: 'src/lib/http-change-flow-gateway.ts',
      line: 21,
      endLine: 34,
      change: 'added',
    },
    {
      id: 'player#_legacy_roll',
      name: 'Player._legacy_roll',
      kind: 'method',
      path: 'scenes/player/player.gd',
      line: 27,
      endLine: 31,
      change: 'removed',
    },
  ],
  edges: [
    {
      from: 'tab-panel#TabPanel',
      to: 'diff-viewer#DiffViewer',
      line: 18,
      via: 'call',
      label: null,
    },
    {
      from: 'diff-viewer#DiffViewer',
      to: 'use-file-diff#useFileDiff',
      line: 16,
      via: 'call',
      label: null,
    },
    {
      from: 'use-file-diff#useFileDiff',
      to: 'diff-line-reveal#isInHunk',
      line: 48,
      via: 'call',
      label: null,
    },
    {
      from: 'tab-panel#TabPanel',
      to: 'file-tab-view#FileTabView',
      line: 32,
      via: 'call',
      label: null,
    },
    {
      from: 'hud#_ready',
      to: 'hud#_on_stamina_changed',
      line: 12,
      via: 'connect',
      label: 'stamina_changed',
    },
    {
      from: 'use-file-diff#useFileDiff',
      to: 'http-gateway#load',
      line: 30,
      via: 'implementation',
      label: null,
    },
    {
      from: 'stamina#consume',
      to: 'hud#_on_stamina_changed',
      line: 22,
      via: 'signal',
      label: 'stamina_changed',
    },
  ],
  origins: {
    'tab-panel#TabPanel': [
      { name: 'ReviewMain', path: 'src/layouts/review-main.tsx', line: 12 },
      { name: 'StressTabsStory', path: 'src/stories/support/stress-tabs-story.tsx', line: 40 },
    ],
  },
}

const layout = CallFlowLayouts.of(graph)

const rows = CallFlowRows.of(graph, layout, CallFlowOpenWalks.of(graph, layout, ''), {
  collapsed: new Set(),
  opened: new Set(),
})

const connectors = CallFlowConnectors.of(rows)

const positions = TreeKeys.positions(rows)

const ROOT_CONNECTOR = { last: true, continues: [] }

const rowOf = (find: (row: CallFlowRow) => boolean) => {
  const index = rows.findIndex(find)
  if (index < 0) {
    throw new Error('call flow row story: row not found')
  }
  const row = rows[index]
  return {
    row,
    position: positions[index],
    connector: connectors.get(row.key) ?? ROOT_CONNECTOR,
  }
}

const nodeRow = (id: string, parentId: string | null = null) => {
  const found = rowOf((row) => {
    if (row.type !== 'node' || row.node.id !== id) {
      return false
    }
    return parentId === null || row.parent?.id === parentId
  })
  if (found.row.type !== 'node') {
    throw new Error('call flow row story: not a node row')
  }
  return { row: found.row, position: found.position, connector: found.connector }
}

const recursiveRow = nodeRow('diff-line-reveal#isInHunk')

const meta = {
  title: 'Components/Sidebar/CallFlowRowView',
  component: CallFlowRowView,
  args: {
    id: 'call-flow-row',
    ...nodeRow('use-file-diff#useFileDiff'),
    selected: false,
    marked: false,
    onToggle: fn(),
    onOpen: fn(),
  },
  argTypes: {
    row: { table: { disable: true } },
    position: { table: { disable: true } },
    connector: { table: { disable: true } },
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
} satisfies Meta<typeof CallFlowRowView>

export default meta

type Story = StoryObj<typeof meta>

export const Node: Story = {}

export const Selected: Story = { args: { selected: true } }

export const Marked: Story = { args: { marked: true } }

export const EntryPoint: Story = { args: nodeRow('tab-panel#TabPanel') }

export const Origin: Story = {
  args: rowOf((row) => {
    return row.type === 'origin'
  }),
}

export const Group: Story = {
  args: rowOf((row) => {
    return row.type === 'group'
  }),
}

export const Removed: Story = { args: nodeRow('player#_legacy_roll') }

export const Signal: Story = {
  args: nodeRow('hud#_on_stamina_changed', 'stamina#consume'),
}

export const Connect: Story = {
  args: nodeRow('hud#_on_stamina_changed', 'hud#_ready'),
}

export const Implementation: Story = { args: nodeRow('http-gateway#load') }

export const Recursive: Story = {
  args: { ...recursiveRow, row: { ...recursiveRow.row, cycle: true, expandable: false } },
}

export const Tree: Story = {
  render: () => {
    return (
      <>
        {rows.map((row, index) => {
          return (
            <CallFlowRowView
              key={row.key}
              id={row.key}
              row={row}
              position={positions[index]}
              connector={connectors.get(row.key) ?? ROOT_CONNECTOR}
              selected={row.type === 'node' && row.node.name === 'useFileDiff'}
              marked={
                row.type === 'node' && row.node.path === 'src/components/definitions/tab-panel.tsx'
              }
              onToggle={fn()}
              onOpen={fn()}
            />
          )
        })}
      </>
    )
  },
}
