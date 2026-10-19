import type { FileContents } from '@pierre/diffs/react'
import * as v from 'valibot'
import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import {
  type FileDiff,
  type FileDiffGateway,
  type FileDiffRequest,
  FileDiffRequests,
} from '@/src/lib/file-diff-gateway.ts'
import type { FileSide } from '@/src/lib/change-set.ts'
import { ImageFiles, type ImagePair } from '@/src/lib/image-files.ts'

export class HttpFileDiffGateway extends HttpGateway implements FileDiffGateway {
  private static readonly path = '/api/file-diff'
  private static readonly blobPath = '/api/file-blob'
  private revision = 0

  private static readonly file = v.nullable(v.object({ name: v.string(), contents: v.string() }))

  private static readonly body = v.object({
    binary: v.boolean(),
    oldFile: HttpFileDiffGateway.file,
    newFile: HttpFileDiffGateway.file,
  })

  private static queryFor({ comparison, change }: FileDiffRequest) {
    const query = ComparisonRules.searchParams(comparison)
    query.set('path', change.path)
    if (change.previousPath) {
      query.set('previousPath', change.previousPath)
    }
    return query
  }

  private static withCacheKey(
    file: v.InferOutput<typeof HttpFileDiffGateway.file>,
    cacheKey: string,
  ): FileContents | null {
    if (!file) {
      return null
    }
    return { ...file, cacheKey }
  }

  async load(request: FileDiffRequest): Promise<FileDiff> {
    const path = ApiClient.withQuery(
      HttpFileDiffGateway.path,
      HttpFileDiffGateway.queryFor(request),
    )
    const { binary, oldFile, newFile } = await this.api.get(path, HttpFileDiffGateway.body)
    this.revision += 1
    const key = `${FileDiffRequests.key(request)}::${this.revision}`
    let images: ImagePair | null = null
    if (binary && ImageFiles.isImage(request.change.path)) {
      images = ImageFiles.pair(request.change, (side) => {
        return this.blobUrl(request, side)
      })
    }
    return {
      binary,
      oldFile: HttpFileDiffGateway.withCacheKey(oldFile, `${key}::old`),
      newFile: HttpFileDiffGateway.withCacheKey(newFile, `${key}::new`),
      images,
    }
  }

  private blobUrl(request: FileDiffRequest, side: FileSide) {
    const query = HttpFileDiffGateway.queryFor(request)
    query.set('side', side)
    return this.api.url(ApiClient.withQuery(HttpFileDiffGateway.blobPath, query))
  }
}
