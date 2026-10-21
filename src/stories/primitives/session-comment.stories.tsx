import type { Meta, StoryObj } from '@storybook/react-vite'
import { CodeSnippetView } from '@/src/primitives/code-snippet-view.tsx'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'
import { ReplyEntry } from '@/src/primitives/reply-entry.tsx'
import { ReplyThread } from '@/src/primitives/reply-thread.tsx'
import { SessionComment } from '@/src/primitives/session-comment.tsx'
import { fn } from 'storybook/test'

const meta = {
  title: 'Primitives/SessionComment',
  component: SessionComment,
  args: {
    filePath: '.github/workflows/production-ci.yml',
    location: 'L16-17',
    snippet: (
      <CodeSnippetView
        lines={[
          {
            number: 16,
            tokens: [{ content: '          node-version: 22', italic: false, bold: false }],
          },
          { number: 17, tokens: [{ content: '          cache: npm', italic: false, bold: false }] },
        ]}
      />
    ),
    body: 'Pin the node version in .nvmrc instead so local and CI match.',
    onOpenFile: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof SessionComment>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithReplies: Story = {
  args: {
    replies: (
      <ReplyThread>
        <ReplyEntry author={'agent'} age={'20m ago'} body={'Moved the version to .nvmrc.'} />
      </ReplyThread>
    ),
  },
}

export const Outdated: Story = {
  args: { marker: <OutdatedLabel />, dimmed: true },
}

export const Highlighted: Story = { args: { highlighted: true } }
