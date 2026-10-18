import { ChangeStatuses, type FileChange, type FileSide } from '@/src/lib/change-set.ts'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif'])

export interface ImageSize {
  width: number
  height: number
}

export interface ImagePair {
  before: string | null
  after: string | null
}

export abstract class ImageFiles {
  static isImage(path: string) {
    return IMAGE_EXTENSIONS.has(path.split('.').pop()?.toLowerCase() ?? '')
  }

  static sizeLabel({ width, height }: ImageSize) {
    return `${width} x ${height}`
  }

  static pair({ status }: FileChange, urlFor: (side: FileSide) => string): ImagePair {
    return {
      before: ChangeStatuses.hasOldSide(status) ? urlFor('old') : null,
      after: ChangeStatuses.hasNewSide(status) ? urlFor('new') : null,
    }
  }
}
