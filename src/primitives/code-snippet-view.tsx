import { c } from '@/src/c.ts'
import type { ReadingSize } from '@/src/lib/comment-reader-rules.ts'
import type { SnippetViewLine } from '@/src/lib/snippet-highlighter.ts'

interface CodeSnippetViewProps {
  lines: SnippetViewLine[]
  background?: string
  foreground?: string
  gutterWidth?: string
  size?: ReadingSize
}

export function CodeSnippetView({
  lines,
  background,
  foreground,
  gutterWidth,
  size = 'compact',
}: CodeSnippetViewProps) {
  return (
    <div
      style={{ background, color: foreground }}
      className={c(
        'overflow-auto rounded border border-line bg-surface-subtle font-editor',
        size === 'compact' && 'max-h-32 py-0.5 text-mini leading-4',
        size === 'reader' && 'py-1.5 text-[0.8125rem] leading-5',
      )}
    >
      {lines.map((line) => {
        return (
          <div key={line.number} className={'flex w-max min-w-full'}>
            <span
              className={'w-8 shrink-0 pr-2 text-right opacity-45 select-none'}
              style={{ width: gutterWidth }}
            >
              {line.number}
            </span>
            <span className={'pr-2 whitespace-pre'}>
              {line.tokens.map((token, index) => {
                return (
                  <span
                    key={index}
                    style={{
                      color: token.color,
                      fontStyle: token.italic ? 'italic' : undefined,
                      fontWeight: token.bold ? 600 : undefined,
                    }}
                  >
                    {token.content}
                  </span>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
