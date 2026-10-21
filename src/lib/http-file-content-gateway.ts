import { ApiClient } from '@/src/lib/api-client.ts'
import {
  type FileContentGateway,
  type FileContentRequest,
  FileContentRequests,
  FileContentShapes,
} from '@/src/lib/file-content-gateway.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'

export class HttpFileContentGateway extends HttpGateway implements FileContentGateway {
  private static readonly path = '/api/file-content'

  async load(request: FileContentRequest) {
    const params = new URLSearchParams()
    params.set(request.external ? 'external' : 'path', request.path)
    const content = await this.api.get(
      ApiClient.withQuery(HttpFileContentGateway.path, params),
      FileContentShapes.content,
    )
    return { ...content, cacheKey: this.revisionKey(FileContentRequests.key(request)) }
  }
}
