import { useImageSize } from '@/src/hooks/use-image-size.ts'
import type { ImagePaneModel } from '@/src/hooks/use-image-diff-view.ts'
import { ImageFiles } from '@/src/lib/image-files.ts'
import { ImageCaption } from '@/src/primitives/image-caption.tsx'
import { ImageFrame } from '@/src/primitives/image-frame.tsx'

export function ImagePane({ tone, label, src }: ImagePaneModel) {
  const { size, onLoad } = useImageSize()

  return (
    <figure className={'min-w-0'}>
      <ImageCaption label={label} tone={tone} meta={size && ImageFiles.sizeLabel(size)} />
      <ImageFrame>
        <img
          src={src}
          alt={label}
          onLoad={onLoad}
          className={'max-h-[70vh] max-w-full object-contain'}
        />
      </ImageFrame>
    </figure>
  )
}
