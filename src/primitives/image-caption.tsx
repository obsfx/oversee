import { c } from '@/src/c.ts'

export type ImageTone = 'before' | 'after'

interface ImageCaptionProps {
  label: string
  tone: ImageTone
  meta: string | null
}

const TONES: Record<ImageTone, string> = {
  before: 'text-status-deleted',
  after: 'text-status-added',
}

export function ImageCaption({ label, tone, meta }: ImageCaptionProps) {
  return (
    <p className={'flex items-baseline gap-2 pb-1.5 text-mini'}>
      <span className={c('font-medium', TONES[tone])}>{label}</span>
      {meta && <span className={'font-editor text-fg-faint'}>{meta}</span>}
    </p>
  )
}
