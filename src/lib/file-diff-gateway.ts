import type { FileContents } from '@pierre/diffs/react'
import type { FileChange } from '@/src/lib/change-set.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import type { ImagePair } from '@/src/lib/image-files.ts'

export interface FileDiff {
  binary: boolean
  oldFile: FileContents | null
  newFile: FileContents | null
  images: ImagePair | null
}

export interface FileDiffRequest {
  comparison: Comparison
  change: FileChange
}

export interface FileDiffGateway {
  load(request: FileDiffRequest): Promise<FileDiff>
}

export abstract class FileDiffRequests {
  static key({ comparison, change }: FileDiffRequest) {
    return `${ComparisonRules.key(comparison)}::${change.previousPath ?? ''}::${change.path}`
  }
}
