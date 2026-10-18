import { ApiClient } from './api-client.ts'
import { HttpBranchGateway } from './http-branch-gateway.ts'
import { InMemoryCommentGateway } from './in-memory-comment-gateway.ts'
import { Services } from './services.ts'

const apiClient = new ApiClient(import.meta.env.VITE_API_URL ?? 'http://localhost:3000')

export const appServices = new Services({
  branches: new HttpBranchGateway(apiClient),
  comments: new InMemoryCommentGateway(),
})
