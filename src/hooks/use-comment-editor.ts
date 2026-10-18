import { Extension, useEditor, useEditorState } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'

export interface CommentEditorOptions {
  initialBody: string
  placeholder: string
  onSubmit: (body: string) => void
  onCancel: () => void
  className: string
}

export const useCommentEditor = ({
  initialBody,
  placeholder,
  onSubmit,
  onCancel,
  className,
}: CommentEditorOptions) => {
  const handlers = useRef({ onSubmit, onCancel })

  useEffect(() => {
    handlers.current = { onSubmit, onCancel }
  }, [onSubmit, onCancel])

  const editor = useEditor({
    extensions: [
      ...CommentMarkdown.editorExtensions(placeholder),
      Extension.create({
        name: 'commentKeys',
        addKeyboardShortcuts() {
          return {
            'Mod-Enter': ({ editor: current }) => {
              const body = current.getMarkdown().trim()
              if (body.length > 0) {
                handlers.current.onSubmit(body)
              }
              return true
            },
            Escape: () => {
              handlers.current.onCancel()
              return true
            },
          }
        },
      }),
    ],
    content: initialBody,
    contentType: 'markdown',
    autofocus: 'end',
    immediatelyRender: true,
    editorProps: { attributes: { class: className } },
  })

  const isEmpty = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      return current.isEmpty
    },
  })

  const submit = () => {
    const body = editor.getMarkdown().trim()
    if (body.length > 0) {
      onSubmit(body)
    }
  }

  return { editor, isEmpty, submit }
}
