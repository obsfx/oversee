import type { Meta, StoryObj } from '@storybook/react-vite'
import { MarkdownView } from '@/src/components/markdown-view.tsx'
import {
  AGENT_DIAGRAM_REPLY,
  AGENT_LONG_REPLY,
} from '@/src/stories/support/review-session-fixture.ts'

const RICH_BODY = [
  'Extract **expiry math** into `nextExpiry`, keep ~~magic numbers~~ out, see *docs*.',
  '',
  '- does `deleteByUser` emit the audit event?',
  '- should this return the count?',
  '',
  '1. first step',
  '2. second step',
  '',
  '> quoted context from the ticket',
  '',
  '```ts',
  "const ttl = config.getOrThrow<number>('SESSION_TTL_MS')",
  '```',
  '',
  'More at [the RFC](https://example.com/rfc).',
].join('\n')

const meta = {
  title: 'Components/MarkdownView',
  component: MarkdownView,
  args: { body: RICH_BODY },
  decorators: [
    (Story) => {
      return (
        <div className={'w-[32rem]'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof MarkdownView>

export default meta

type Story = StoryObj<typeof meta>

export const Rich: Story = {}

export const Plain: Story = { args: { body: 'A plain one line comment.' } }

export const Mermaid: Story = { args: { body: AGENT_DIAGRAM_REPLY } }

export const Reader: Story = { args: { body: AGENT_LONG_REPLY, size: 'reader' } }
