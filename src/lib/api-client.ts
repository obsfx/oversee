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

  static fieldsOf(body: unknown) {
    return (body ?? {}) as Record<string, unknown>
  }

  url(path: string) {
    return new URL(path, this.baseUrl).toString()
  }

  get<T>(path: string, parse: (body: unknown) => T) {
    return this.request(path, { method: 'GET' }, parse)
  }

  send<T>(method: WriteMethod, path: string, payload: unknown, parse: (body: unknown) => T) {
    return this.request(
      path,
      {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
      parse,
    )
  }

  async delete(path: string) {
    const response = await fetch(this.url(path), { method: 'DELETE' })
    if (!response.ok) {
      throw new ApiError(path, 'request failed', response.status)
    }
  }

  private async request<T>(path: string, init: RequestInit, parse: (body: unknown) => T) {
    const response = await fetch(this.url(path), init)
    if (!response.ok) {
      throw new ApiError(path, 'request failed', response.status)
    }
    const body: unknown = await response.json()
    return parse(body)
  }
}
