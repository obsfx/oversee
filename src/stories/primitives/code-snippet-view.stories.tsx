import type { Meta, StoryObj } from '@storybook/react-vite'
import { CodeSnippetView } from '@/src/primitives/code-snippet-view.tsx'

const plain = (number: number, content: string) => {
  return { number, tokens: [{ content, italic: false, bold: false }] }
}

const meta = {
  title: 'Primitives/CodeSnippetView',
  component: CodeSnippetView,
  args: {
    lines: [
      {
        number: 53,
        tokens: [
          { content: '  async ', color: '#d73a49', italic: false, bold: false },
          { content: 'revokeAllForUser', color: '#6f42c1', italic: false, bold: false },
          { content: '(userId: string) {', italic: false, bold: false },
        ],
      },
      plain(54, '    await this.sessions.deleteByUser(userId)'),
      plain(55, "    this.logger.info('sessions revoked', { userId })"),
      plain(56, '  }'),
    ],
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof CodeSnippetView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ThemedBackground: Story = { args: { background: '#0d1117', foreground: '#e6edf3' } }
