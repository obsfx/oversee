import type { FileContents } from '@pierre/diffs/react'
import { ApiClient, ApiError } from '@/src/lib/api-client.ts'
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
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpFileDiffGateway extends HttpGateway implements FileDiffGateway {
  private static readonly path = '/get-file-diff'
  private static readonly blobPath = '/get-file-blob'

  private static queryFor({ comparison, change }: FileDiffRequest) {
    const query = ComparisonRules.searchParams(comparison)
    query.set('path', change.path)
    if (change.previousPath) {
      query.set('previousPath', change.previousPath)
    }
    return query
  }

  private static parseFile(value: unknown, cacheKey: string): FileContents | null {
    if (value === null) {
      return null
    }
    const { name, contents } = ApiClient.fieldsOf(value)
    if (!ValueGuards.isString(name) || !ValueGuards.isString(contents)) {
      throw ApiError.unexpectedShape(HttpFileDiffGateway.path)
    }
    return { name, contents, cacheKey }
  }

  load(request: FileDiffRequest) {
    const path = ApiClient.withQuery(
      HttpFileDiffGateway.path,
      HttpFileDiffGateway.queryFor(request),
    )
    return this.api.get(path, (body) => {
      return this.parse(request, body)
    })
  }

  private parse(request: FileDiffRequest, body: unknown): FileDiff {
    const { binary, oldFile, newFile } = ApiClient.fieldsOf(body)
    if (typeof binary !== 'boolean') {
      throw ApiError.unexpectedShape(HttpFileDiffGateway.path)
    }
    const key = FileDiffRequests.key(request)
    let images: ImagePair | null = null
    if (binary && ImageFiles.isImage(request.change.path)) {
      images = ImageFiles.pair(request.change, (side) => {
        return this.blobUrl(request, side)
      })
    }
    return {
      binary,
      oldFile: HttpFileDiffGateway.parseFile(oldFile, `${key}::old`),
      newFile: HttpFileDiffGateway.parseFile(newFile, `${key}::new`),
      images,
    }
  }

  private blobUrl(request: FileDiffRequest, side: FileSide) {
    const query = HttpFileDiffGateway.queryFor(request)
    query.set('side', side)
    return this.api.url(ApiClient.withQuery(HttpFileDiffGateway.blobPath, query))
  }
}
