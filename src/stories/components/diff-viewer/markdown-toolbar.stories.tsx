import type { Meta, StoryObj } from '@storybook/react-vite'
import { MarkdownToolbar } from '@/src/components/diff-viewer/markdown-toolbar.tsx'
import { StoryEditor } from '@/src/stories/support/story-editor.tsx'

const meta = {
  title: 'Components/DiffViewer/MarkdownToolbar',
  render: () => {
    return (
      <StoryEditor body={'Select some **text** and use the toolbar.'}>
        {(editor) => {
          return (
            <div className={'border-b border-line px-1 py-0.5'}>
              <MarkdownToolbar editor={editor} />
            </div>
          )
        }}
      </StoryEditor>
    )
  },
} satisfies Meta

export default meta

export const Default: StoryObj<typeof meta> = {}
