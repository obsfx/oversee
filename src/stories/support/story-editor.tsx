import { EditorContent, type Editor, useEditor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'

interface StoryEditorProps {
  body: string
  children: (editor: Editor) => ReactNode
}

export function StoryEditor({ body, children }: StoryEditorProps) {
  const editor = useEditor({
    extensions: CommentMarkdown.editorExtensions('Type here'),
    content: body,
    contentType: 'markdown',
    immediatelyRender: true,
    editorProps: { attributes: { class: 'comment-prose min-h-12 px-2 py-1.5' } },
  })

  return (
    <div className={'w-[28rem] rounded-md border border-line bg-popup'}>
      {children(editor)}
      <EditorContent editor={editor} />
    </div>
  )
}
