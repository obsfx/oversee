import type { Meta, StoryObj } from '@storybook/react-vite'
import { MermaidDiagram } from '@/src/components/mermaid-diagram.tsx'

const meta = {
  title: 'Components/MermaidDiagram',
  component: MermaidDiagram,
  args: {
    source: [
      'flowchart LR',
      '  A[deleteAdminUsers] --> B{loadUsers}',
      '  B -->|found| C[firebaseUserDeletion]',
      '  B -->|missing| E[skip id]',
      '  C -->|ok| D[(users table delete)]',
      '  C -->|error| F[keep rows, report id]',
    ].join('\n'),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'comment-prose w-[26rem]'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof MermaidDiagram>

export default meta

type Story = StoryObj<typeof meta>

export const Flowchart: Story = {}

export const Sequence: Story = {
  args: {
    source: [
      'sequenceDiagram',
      '  participant UI',
      '  participant Server',
      '  participant Git',
      '  UI->>Server: GET /api/file-diff',
      '  Server->>Git: diff --raw',
      '  Git-->>Server: hunks',
      '  Server-->>UI: FileDiff',
    ].join('\n'),
  },
}

export const State: Story = {
  args: {
    source: [
      'stateDiagram-v2',
      '  [*] --> created',
      '  created --> inProgress: review start',
      '  inProgress --> closed: review close',
      '  closed --> [*]',
    ].join('\n'),
  },
}

export const Invalid: Story = {
  args: { source: 'flowchart LR\n  A -->' },
}

export const Unsupported: Story = {
  args: { source: 'notADiagram\n  hello' },
}
