export class ApiError extends Error {
  readonly path: string
  readonly status: number | null

  constructor(path: string, message: string, status: number | null = null) {
    super(`${path}: ${message}`)
    this.name = 'ApiError'
    this.path = path
    this.status = status
  }
}

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(path: string, parse: (body: unknown) => T) {
    const response = await fetch(new URL(path, this.baseUrl))
    if (!response.ok) {
      throw new ApiError(path, 'request failed', response.status)
    }
    const body: unknown = await response.json()
    return parse(body)
  }
}
