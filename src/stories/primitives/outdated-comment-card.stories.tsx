import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscGoToFile, VscTrash } from 'react-icons/vsc'
import { fn } from 'storybook/test'
import { Button } from '@/src/primitives/button.tsx'
import { CodeSnippetView } from '@/src/primitives/code-snippet-view.tsx'
import { OutdatedCommentCard } from '@/src/primitives/outdated-comment-card.tsx'

const meta = {
  title: 'Primitives/OutdatedCommentCard',
  component: OutdatedCommentCard,
  args: {
    filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
    location: 'L30-32',
    age: 'outdated 6m ago',
    onOpenFile: fn(),
    snippet: (
      <CodeSnippetView
        lines={[
          {
            number: 30,
            tokens: [{ content: '    if (!user) {', italic: false, bold: false }],
          },
          { number: 31, tokens: [{ content: '      return null', italic: false, bold: false }] },
          { number: 32, tokens: [{ content: '    }', italic: false, bold: false }] },
        ]}
      />
    ),
    body: 'This early return skips the audit log for failed logins.',
    actions: (
      <>
        <Button variant={'ghost'}>
          <VscGoToFile />
          Open file
        </Button>
        <Button variant={'ghost'}>
          <VscTrash />
          Delete
        </Button>
      </>
    ),
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
} satisfies Meta<typeof OutdatedCommentCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const DeleteFailed: Story = { args: { error: 'Could not delete the comment.' } }
