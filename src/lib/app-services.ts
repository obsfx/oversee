import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpBranchGateway } from '@/src/lib/http-branch-gateway.ts'
import { HttpChangeSetGateway } from '@/src/lib/http-change-set-gateway.ts'
import { HttpCommentGateway } from '@/src/lib/http-comment-gateway.ts'
import { HttpFileDiffGateway } from '@/src/lib/http-file-diff-gateway.ts'
import { Services } from '@/src/lib/services.ts'

const apiClient = new ApiClient(import.meta.env.VITE_API_URL ?? 'http://localhost:3000')

export const appServices = new Services({
  branches: new HttpBranchGateway(apiClient),
  comments: new HttpCommentGateway(apiClient),
  changeSets: new HttpChangeSetGateway(apiClient),
  fileDiffs: new HttpFileDiffGateway(apiClient),
})
