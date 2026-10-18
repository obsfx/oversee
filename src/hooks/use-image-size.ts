import { type SyntheticEvent, useState } from 'react'
import type { ImageSize } from '@/src/lib/image-files.ts'

export const useImageSize = () => {
  const [size, setSize] = useState<ImageSize | null>(null)

  const onLoad = ({ currentTarget }: SyntheticEvent<HTMLImageElement>) => {
    setSize({ width: currentTarget.naturalWidth, height: currentTarget.naturalHeight })
  }

  return { size, onLoad }
}
