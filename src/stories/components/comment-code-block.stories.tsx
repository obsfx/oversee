import type { Meta, StoryObj } from '@storybook/react-vite'
import { getSchema } from '@tiptap/react'
import { Node as ProseNode } from '@tiptap/pm/model'
import { CommentCodeBlock } from '@/src/components/comment-code-block.tsx'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'

const schema = getSchema(CommentMarkdown.renderExtensions)

const codeBlockOf = (markdown: string) => {
  const doc = ProseNode.fromJSON(schema, CommentMarkdown.parse(markdown))
  const block = doc.firstChild
  if (!block) {
    throw new Error('the markdown has no code block')
  }
  return block
}

const meta = {
  title: 'Components/CommentCodeBlock',
  component: CommentCodeBlock,
  args: {
    node: codeBlockOf('```ts\nconst ttl = config.getOrThrow<number>("SESSION_TTL_MS")\n```'),
    children: 'const ttl = config.getOrThrow<number>("SESSION_TTL_MS")',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'comment-prose w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof CommentCodeBlock>

export default meta

type Story = StoryObj<typeof meta>

export const Code: Story = {}

export const Mermaid: Story = {
  args: {
    node: codeBlockOf('```mermaid\nflowchart TD\n  Comment --> Reply\n  Reply --> Closed\n```'),
    children: undefined,
  },
}
