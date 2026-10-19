import { Placeholder } from '@tiptap/extensions'
import { Markdown, MarkdownManager } from '@tiptap/markdown'
import { StarterKit } from '@tiptap/starter-kit'

const starterKit = StarterKit.configure({
  heading: { levels: [1, 2, 3] },
  link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
})

const MARKDOWN_TOKENS = /[*_`#>~[\]]/g
const LIST_MARKER = /^\s*([-+]|\d+\.)\s+/
const MARKED_OPTIONS = { breaks: true }

export abstract class CommentMarkdown {
  static readonly renderExtensions = [starterKit]

  private static readonly manager = new MarkdownManager({
    extensions: CommentMarkdown.renderExtensions,
    markedOptions: MARKED_OPTIONS,
  })

  static editorExtensions(placeholder: string) {
    return [
      starterKit,
      Markdown.configure({ markedOptions: MARKED_OPTIONS }),
      Placeholder.configure({ placeholder }),
    ]
  }

  static parse(body: string) {
    return CommentMarkdown.manager.parse(body)
  }

  static summary(body: string) {
    const line = body.split('\n').find((candidate) => {
      return candidate.trim().length > 0
    })
    return (line ?? '').replace(LIST_MARKER, '').replace(MARKDOWN_TOKENS, '').trim()
  }
}
