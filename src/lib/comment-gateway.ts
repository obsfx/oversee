export interface ReviewComment {
  id: string
  filePath: string
  line: number
  body: string
}

export interface CommentGateway {
  list(): Promise<ReviewComment[]>
}
