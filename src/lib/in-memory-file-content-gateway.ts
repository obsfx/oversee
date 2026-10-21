import { ApiError } from '@/src/lib/api-client.ts'
import {
  type FileContent,
  type FileContentGateway,
  type FileContentRequest,
  FileContentRequests,
} from '@/src/lib/file-content-gateway.ts'

// Storybook stand-in for HttpFileContentGateway, never used by the app. Stories run without the
// Go server, so read-only tabs read their contents from the files the story supplies, keyed by
// FileContentRequests.key.
export class InMemoryFileContentGateway implements FileContentGateway {
  private readonly files: ReadonlyMap<string, string>

  constructor(files: ReadonlyMap<string, string>) {
    this.files = files
  }

  load(request: FileContentRequest): Promise<FileContent> {
    const key = FileContentRequests.key(request)
    const contents = this.files.get(key)
    if (contents === undefined) {
      return Promise.reject(
        new ApiError(`/api/file-content?path=${request.path}`, 'not found', 404),
      )
    }
    return Promise.resolve({ path: request.path, contents, cacheKey: key })
  }
}
