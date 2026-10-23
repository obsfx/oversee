export type NoticeTone = 'accent' | 'warning' | 'danger' | 'success' | 'neutral'

const SURFACES: Record<NoticeTone, string> = {
  accent: 'border-accent/20 bg-accent-subtle/60',
  warning: 'border-status-modified/25 bg-status-modified/8',
  danger: 'border-danger/25 bg-danger/8',
  success: 'border-reviewed/25 bg-reviewed/8',
  neutral: 'border-line bg-surface-subtle',
}

const ICONS: Record<NoticeTone, string> = {
  accent: 'text-accent',
  warning: 'text-status-modified',
  danger: 'text-danger',
  success: 'text-reviewed',
  neutral: 'text-fg-faint',
}

export abstract class NoticeTones {
  static readonly surface = SURFACES

  static readonly icon = ICONS
}
