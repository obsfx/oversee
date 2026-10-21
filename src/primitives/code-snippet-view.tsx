import type { SnippetViewLine } from '@/src/lib/snippet-highlighter.ts'

interface CodeSnippetViewProps {
  lines: SnippetViewLine[]
  background?: string
  foreground?: string
  gutterWidth?: string
}

export function CodeSnippetView({
  lines,
  background,
  foreground,
  gutterWidth,
}: CodeSnippetViewProps) {
  return (
    <div
      style={{ background, color: foreground }}
      className={
        'max-h-32 overflow-auto rounded border border-line bg-surface-subtle py-0.5 font-editor text-mini leading-4'
      }
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
