import { type Editor, useEditorState } from '@tiptap/react'
import type { ReactNode } from 'react'
import {
  LuBold,
  LuCode,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuQuote,
  LuSquareCode,
  LuStrikethrough,
} from 'react-icons/lu'
import { IconButton } from '@/src/primitives/icon-button.tsx'

interface ToolbarAction {
  key: string
  label: string
  icon: ReactNode
  isActive: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const promptLink = (editor: Editor) => {
  const previous = editor.getAttributes('link').href as string | undefined
  const href = window.prompt('Link URL', previous ?? 'https://')
  if (href === null) {
    return
  }
  if (href === '') {
    editor.chain().focus().unsetLink().run()
    return
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
}

const ACTIONS: ToolbarAction[] = [
  {
    key: 'bold',
    label: 'Bold (Mod+B or **text**)',
    icon: <LuBold />,
    isActive: (editor) => {
      return editor.isActive('bold')
    },
    run: (editor) => {
      editor.chain().focus().toggleBold().run()
    },
  },
  {
    key: 'italic',
    label: 'Italic (Mod+I or *text*)',
    icon: <LuItalic />,
    isActive: (editor) => {
      return editor.isActive('italic')
    },
    run: (editor) => {
      editor.chain().focus().toggleItalic().run()
    },
  },
  {
    key: 'strike',
    label: 'Strikethrough (~~text~~)',
    icon: <LuStrikethrough />,
    isActive: (editor) => {
      return editor.isActive('strike')
    },
    run: (editor) => {
      editor.chain().focus().toggleStrike().run()
    },
  },
  {
    key: 'code',
    label: 'Inline code (`code`)',
    icon: <LuCode />,
    isActive: (editor) => {
      return editor.isActive('code')
    },
    run: (editor) => {
      editor.chain().focus().toggleCode().run()
    },
  },
  {
    key: 'link',
    label: 'Link',
    icon: <LuLink />,
    isActive: (editor) => {
      return editor.isActive('link')
    },
    run: promptLink,
  },
  {
    key: 'bullet',
    label: 'Bullet list (- item)',
    icon: <LuList />,
    isActive: (editor) => {
      return editor.isActive('bulletList')
    },
    run: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    key: 'ordered',
    label: 'Numbered list (1. item)',
    icon: <LuListOrdered />,
    isActive: (editor) => {
      return editor.isActive('orderedList')
    },
    run: (editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    key: 'quote',
    label: 'Quote (> text)',
    icon: <LuQuote />,
    isActive: (editor) => {
      return editor.isActive('blockquote')
    },
    run: (editor) => {
      editor.chain().focus().toggleBlockquote().run()
    },
  },
  {
    key: 'codeBlock',
    label: 'Code block (```)',
    icon: <LuSquareCode />,
    isActive: (editor) => {
      return editor.isActive('codeBlock')
    },
    run: (editor) => {
      editor.chain().focus().toggleCodeBlock().run()
    },
  },
]

export function MarkdownToolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      return ACTIONS.map((action) => {
        return action.isActive(current)
      })
    },
  })

  return (
    <div className={'flex items-center gap-px'}>
      {ACTIONS.map((action, index) => {
        return (
          <IconButton
            key={action.key}
            title={action.label}
            aria-label={action.label}
            aria-pressed={active[index]}
            className={'size-5.5 min-w-5.5 text-xs'}
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={() => {
              action.run(editor)
            }}
          >
            {action.icon}
          </IconButton>
        )
      })}
    </div>
  )
}
