import * as v from 'valibot'

export class ApiError extends Error {
  readonly path: string
  readonly status: number | null

  constructor(path: string, message: string, status: number | null = null) {
    super(`${path}: ${message}`)
    this.name = 'ApiError'
    this.path = path
    this.status = status
  }

  static unexpectedShape(path: string) {
    return new ApiError(path, 'unexpected response shape')
  }

  static describe(error: unknown, subject: string) {
    if (error instanceof ApiError && error.status !== null) {
      return `${subject} failed with status ${error.status}`
    }
    return `${subject} failed`
  }
}

type WriteMethod = 'POST' | 'PATCH'

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  static withQuery(path: string, query: URLSearchParams) {
    return `${path}?${query.toString()}`
  }

  static parse<TSchema extends v.GenericSchema>(
    schema: TSchema,
    body: unknown,
    path: string,
  ): v.InferOutput<TSchema> {
    const result = v.safeParse(schema, body)
    if (!result.success) {
      throw ApiError.unexpectedShape(path)
    }
    return result.output
  }

  private static jsonInit(method: WriteMethod, payload: unknown): RequestInit {
    return {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }
  }

  url(path: string) {
    return new URL(path, this.baseUrl).toString()
  }

  get<TSchema extends v.GenericSchema>(path: string, schema: TSchema) {
    return this.request(path, { method: 'GET' }, schema)
  }

  send<TSchema extends v.GenericSchema>(
    method: WriteMethod,
    path: string,
    payload: unknown,
    schema: TSchema,
  ) {
    return this.request(path, ApiClient.jsonInit(method, payload), schema)
  }

  async sendWithoutContent(method: WriteMethod, path: string, payload: unknown) {
    await this.fetchOk(path, ApiClient.jsonInit(method, payload))
  }

  async delete(path: string) {
    await this.fetchOk(path, { method: 'DELETE' })
  }

  private async request<TSchema extends v.GenericSchema>(
    path: string,
    init: RequestInit,
    schema: TSchema,
  ) {
    const response = await this.fetchOk(path, init)
    const body: unknown = await response.json()
    return ApiClient.parse(schema, body, path)
  }

  private async fetchOk(path: string, init: RequestInit) {
    const response = await fetch(this.url(path), init)
    if (!response.ok) {
      throw new ApiError(path, 'request failed', response.status)
    }
    return response
  }
}
