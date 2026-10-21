import type { AnnotationSide, TokenEventBase } from '@pierre/diffs'
import type { FileSide } from '@/src/lib/change-set.ts'
import { Platform } from '@/src/lib/platform.ts'

export interface HoverToken {
  path: string
  side: FileSide
  line: number
  character: number
  element: HTMLElement
}

export interface TokenEventProps extends TokenEventBase {
  side?: AnnotationSide
}

export interface TokenHandlers {
  onTokenEnter: (props: TokenEventProps, event: PointerEvent) => void
  onTokenLeave: () => void
  onTokenClick: (props: TokenEventProps, event: MouseEvent) => void
}

export abstract class HoverTokens {
  static key({ path, side, line, character }: HoverToken) {
    return `${side}::${path}::${line}:${character}`
  }
}

interface DefinitionHoverPort {
  open(token: HoverToken): void
  close(): void
}

interface ModifierFlags {
  metaKey: boolean
  ctrlKey: boolean
}

export class DefinitionHover {
  static readonly openDelayMs = 180
  static readonly switchDelayMs = 80
  static readonly closeDelayMs = 250
  private readonly port: DefinitionHoverPort
  private readonly apple: boolean
  private hovered: HoverToken | null = null
  private active: HoverToken | null = null
  private modifier = false
  private overPopover = false
  private openTimer: ReturnType<typeof setTimeout> | undefined
  private closeTimer: ReturnType<typeof setTimeout> | undefined

  constructor(port: DefinitionHoverPort, apple: boolean = Platform.isApple) {
    this.port = port
    this.apple = apple
  }

  static sideOf(side: AnnotationSide): FileSide {
    return side === 'deletions' ? 'old' : 'new'
  }

  private static same(left: HoverToken | null, right: HoverToken | null) {
    return left !== null && right !== null && left.element === right.element
  }

  isModifier(flags: ModifierFlags) {
    return this.apple ? flags.metaKey : flags.ctrlKey
  }

  enter(token: HoverToken, flags: ModifierFlags) {
    this.hovered = token
    this.modifier = this.isModifier(flags)
    clearTimeout(this.closeTimer)
    this.scheduleOpen()
  }

  leave() {
    this.hovered = null
    clearTimeout(this.openTimer)
    this.scheduleClose()
  }

  click(event: MouseEvent) {
    if (!this.isModifier(event)) {
      return false
    }
    event.preventDefault()
    this.dismiss()
    return true
  }

  show(token: HoverToken) {
    if (!DefinitionHover.same(this.hovered, token)) {
      return
    }
    clearTimeout(this.openTimer)
    clearTimeout(this.closeTimer)
    this.openNow(token)
  }

  key(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.dismiss()
      return
    }
    this.modifier = this.isModifier(event)
    this.scheduleOpen()
  }

  blur() {
    this.modifier = false
    clearTimeout(this.openTimer)
  }

  popoverEnter() {
    this.overPopover = true
    clearTimeout(this.closeTimer)
  }

  popoverLeave() {
    this.overPopover = false
    if (!this.hovered) {
      this.scheduleClose()
    }
  }

  dismiss() {
    clearTimeout(this.openTimer)
    clearTimeout(this.closeTimer)
    this.overPopover = false
    if (this.active) {
      this.active = null
      this.port.close()
    }
  }

  dispose() {
    clearTimeout(this.openTimer)
    clearTimeout(this.closeTimer)
  }

  private scheduleOpen() {
    clearTimeout(this.openTimer)
    const token = this.hovered
    if (!this.modifier || !token || DefinitionHover.same(this.active, token)) {
      return
    }
    let delay = DefinitionHover.openDelayMs
    if (this.active) {
      delay = DefinitionHover.switchDelayMs
    }
    this.openTimer = setTimeout(() => {
      this.openNow(token)
    }, delay)
  }

  private openNow(token: HoverToken) {
    this.active = token
    this.port.open(token)
  }

  private scheduleClose() {
    clearTimeout(this.closeTimer)
    if (this.overPopover || !this.active) {
      return
    }
    this.closeTimer = setTimeout(() => {
      this.dismiss()
    }, DefinitionHover.closeDelayMs)
  }
}
