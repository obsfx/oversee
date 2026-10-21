import type { SelectionSide, Virtualizer } from '@pierre/diffs'
import type { FileSide } from '@/src/lib/change-set.ts'
import type { LineAnchor } from '@/src/lib/line-range.ts'

interface LinePosition {
  top: number
  height: number
}

interface PositionedInstance {
  getLinePosition(lineNumber: number, side?: SelectionSide): LinePosition | undefined
}

export interface RenderedLines {
  node: HTMLElement
  instance: object
}

export abstract class DiffLineReveal {
  static readonly flashAttribute = 'data-reveal-line'
  static readonly flashMs = 1600

  static readonly css =
    `[${DiffLineReveal.flashAttribute}]{animation:reveal-line ${DiffLineReveal.flashMs}ms cubic-bezier(0.23,1,0.32,1)}` +
    `@keyframes reveal-line{from{box-shadow:inset 3px 0 0 var(--color-accent),inset 0 0 0 999px color-mix(in srgb,var(--color-accent) 18%,transparent)}to{box-shadow:inset 3px 0 0 transparent,inset 0 0 0 999px transparent}}` +
    `@media (prefers-reduced-motion:reduce){[${DiffLineReveal.flashAttribute}]{animation:none;box-shadow:inset 3px 0 0 var(--color-accent)}}`

  static lastLine(contents: string | undefined) {
    if (contents === undefined) {
      return Number.POSITIVE_INFINITY
    }
    let count = 1
    for (
      let index = contents.indexOf('\n');
      index !== -1;
      index = contents.indexOf('\n', index + 1)
    ) {
      count += 1
    }
    if (count > 1 && contents.endsWith('\n')) {
      count -= 1
    }
    return count
  }

  private static isPositioned(instance: object): instance is PositionedInstance {
    return 'getLinePosition' in instance
  }

  static isLaidOut(element: HTMLElement) {
    return element.getClientRects().length > 0
  }

  static scrollToLine(
    virtualizer: Virtualizer,
    { node, instance }: RenderedLines,
    anchor: LineAnchor,
  ) {
    if (!DiffLineReveal.isPositioned(instance)) {
      return false
    }
    const position = instance.getLinePosition(anchor.lineNumber, anchor.side)
    if (!position) {
      return false
    }
    const root = virtualizer.getRoot()
    const viewportHeight = root instanceof HTMLElement ? root.clientHeight : window.innerHeight
    const lineCenter =
      virtualizer.getOffsetInScrollContainer(node) + position.top + position.height / 2
    const top = Math.max(0, lineCenter - viewportHeight / 2)
    const current = root instanceof HTMLElement ? root.scrollTop : window.scrollY
    if (Math.abs(current - top) >= 1) {
      virtualizer.scrollTo({ top })
    }
    return true
  }

  private static lineSelector(lineNumber: number, side: FileSide) {
    const line = `[data-line="${lineNumber}"]`
    if (side === 'old') {
      return [
        `[data-code][data-deletions] ${line}`,
        `[data-code][data-unified] ${line}[data-line-type="change-deletion"]`,
        `[data-code][data-unified] [data-alt-line="${lineNumber}"]`,
      ].join(',')
    }
    return `[data-code]:not([data-deletions]) ${line}:not([data-line-type="change-deletion"])`
  }

  private static lineElements(node: HTMLElement, lineNumber: number, side: FileSide) {
    const root = node.shadowRoot ?? node
    return [
      ...root.querySelectorAll<HTMLElement>(DiffLineReveal.lineSelector(lineNumber, side)),
    ].filter(DiffLineReveal.isLaidOut)
  }

  static lineElement(node: HTMLElement, lineNumber: number, side: FileSide) {
    return DiffLineReveal.lineElements(node, lineNumber, side).at(0) ?? null
  }

  static flash(node: HTMLElement, lineNumber: number, side: FileSide) {
    const lines = DiffLineReveal.lineElements(node, lineNumber, side)
    if (lines.length === 0) {
      return false
    }
    for (const line of lines) {
      line.setAttribute(DiffLineReveal.flashAttribute, '')
    }
    setTimeout(() => {
      for (const line of lines) {
        line.removeAttribute(DiffLineReveal.flashAttribute)
      }
    }, DiffLineReveal.flashMs)
    return true
  }
}
