import type { FileDiff, VirtualizedFileDiff, Virtualizer } from '@pierre/diffs'
import type { DiffAnnotationMeta } from '@/src/lib/comment-annotations.ts'
import type { LineAnchor } from '@/src/lib/line-range.ts'

export interface RenderedDiff {
  node: HTMLElement
  instance: DiffInstance
}

type DiffInstance = FileDiff<DiffAnnotationMeta, undefined>
type VirtualizedInstance = VirtualizedFileDiff<DiffAnnotationMeta, undefined>

export abstract class DiffLineReveal {
  private static isVirtualized(instance: DiffInstance): instance is VirtualizedInstance {
    return 'getLinePosition' in instance
  }

  static isLaidOut(element: HTMLElement) {
    return element.getClientRects().length > 0
  }

  static scrollToLine(
    virtualizer: Virtualizer,
    { node, instance }: RenderedDiff,
    anchor: LineAnchor,
  ) {
    if (!DiffLineReveal.isVirtualized(instance)) {
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
    virtualizer.scrollTo({ top: Math.max(0, lineCenter - viewportHeight / 2) })
    return true
  }
}
