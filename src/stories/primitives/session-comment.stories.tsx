import type { Meta, StoryObj } from '@storybook/react-vite'
import { CodeSnippetView } from '@/src/primitives/code-snippet-view.tsx'
import { SessionComment } from '@/src/primitives/session-comment.tsx'

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

export const Default: StoryObj<typeof meta> = {}
