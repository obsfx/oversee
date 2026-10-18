import {
  type DiffsThemeNames,
  getFiletypeFromFileName,
  getSharedHighlighter,
  type ThemedToken,
} from '@pierre/diffs'
import type { SnapshotLine } from '@/src/lib/review-session-gateway.ts'

export interface SnippetToken {
  content: string
  color?: string
  italic: boolean
  bold: boolean
}

export interface SnippetViewLine {
  number: number
  tokens: SnippetToken[]
}

export interface HighlightedSnippet {
  lines: ThemedToken[][]
  background: string
  foreground: string
}

const FONT_STYLE_ITALIC = 1
const FONT_STYLE_BOLD = 2

export abstract class SnippetHighlighter {
  private static readonly cache = new Map<string, Promise<HighlightedSnippet>>()

  static key(lines: SnapshotLine[], filePath: string, theme: DiffsThemeNames) {
    return `${theme}::${filePath}::${SnippetHighlighter.codeOf(lines)}`
  }

  static highlight(lines: SnapshotLine[], filePath: string, theme: DiffsThemeNames) {
    const key = SnippetHighlighter.key(lines, filePath, theme)
    const cached = SnippetHighlighter.cache.get(key)
    if (cached) {
      return cached
    }
    const pending = SnippetHighlighter.tokenize(SnippetHighlighter.codeOf(lines), filePath, theme)
    SnippetHighlighter.cache.set(key, pending)
    return pending
  }

  static viewLines(
    lines: SnapshotLine[],
    highlighted: HighlightedSnippet | null,
  ): SnippetViewLine[] {
    return lines.map((line, index) => {
      const themed = highlighted?.lines[index]
      if (!themed) {
        return { number: line.number, tokens: [{ content: line.text, italic: false, bold: false }] }
      }
      return {
        number: line.number,
        tokens: themed.map((token) => {
          const fontStyle = token.fontStyle ?? 0
          return {
            content: token.content,
            color: token.color,
            italic: (fontStyle & FONT_STYLE_ITALIC) !== 0,
            bold: (fontStyle & FONT_STYLE_BOLD) !== 0,
          }
        }),
      }
    })
  }

  private static codeOf(lines: SnapshotLine[]) {
    return lines
      .map((line) => {
        return line.text
      })
      .join('\n')
  }

  private static async tokenize(code: string, filePath: string, theme: DiffsThemeNames) {
    const lang = getFiletypeFromFileName(filePath)
    const highlighter = await getSharedHighlighter({ themes: [theme], langs: [lang] })
    const result = highlighter.codeToTokens(code, { lang, theme })
    return {
      lines: result.tokens,
      background: result.bg ?? 'transparent',
      foreground: result.fg ?? 'inherit',
    }
  }
}
