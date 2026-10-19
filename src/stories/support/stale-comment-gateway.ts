import { StaleCommentError } from '@/src/lib/comment-gateway.ts'
import { InMemoryCommentGateway } from '@/src/lib/in-memory-comment-gateway.ts'

export class StaleCommentGateway extends InMemoryCommentGateway {
  create() {
    return Promise.reject(new StaleCommentError())
  }
}
