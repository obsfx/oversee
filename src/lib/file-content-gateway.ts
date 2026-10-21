import * as v from 'valibot'

export interface FileContentRequest {
  path: string
  external: boolean
}

export interface FileContent {
  path: string
  contents: string
  cacheKey: string
}

export interface FileContentGateway {
  load(request: FileContentRequest): Promise<FileContent>
}

export abstract class FileContentRequests {
  static key({ path, external }: FileContentRequest) {
    return `${external ? 'external' : 'repo'}::${path}`
  }
}

export abstract class FileContentShapes {
  static readonly content = v.object({
    path: v.string(),
    contents: v.string(),
  })
}
