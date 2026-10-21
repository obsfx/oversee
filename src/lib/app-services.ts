import { ApiClient } from '@/src/lib/api-client.ts'
import { AppGlobals } from '@/src/lib/app-globals.ts'
import { HttpBranchGateway } from '@/src/lib/http-branch-gateway.ts'
import { HttpChangeSetGateway } from '@/src/lib/http-change-set-gateway.ts'
import { HttpCommentGateway } from '@/src/lib/http-comment-gateway.ts'
import { HttpDefinitionGateway } from '@/src/lib/http-definition-gateway.ts'
import { HttpFileContentGateway } from '@/src/lib/http-file-content-gateway.ts'
import { HttpFileDiffGateway } from '@/src/lib/http-file-diff-gateway.ts'
import { HttpLanguageServerGateway } from '@/src/lib/http-language-server-gateway.ts'
import { HttpNotificationGateway } from '@/src/lib/http-notification-gateway.ts'
import { HttpReviewSessionGateway } from '@/src/lib/http-review-session-gateway.ts'
import { Services } from '@/src/lib/services.ts'
import { HttpSettingsGateway } from '@/src/lib/http-settings-gateway.ts'
import { HttpWorkspaceGateway } from '@/src/lib/http-workspace-gateway.ts'
import { LocalReviewedMarksGateway } from '@/src/lib/local-reviewed-marks-gateway.ts'
import { SocketEventStream } from '@/src/lib/socket-event-stream.ts'

export const appGlobals = AppGlobals.read()

const apiClient = new ApiClient(appGlobals.baseUrl)

export const appServices = new Services({
  workspace: new HttpWorkspaceGateway(apiClient, appGlobals.workspace),
  branches: new HttpBranchGateway(apiClient),
  comments: new HttpCommentGateway(apiClient),
  sessions: new HttpReviewSessionGateway(apiClient),
  changeSets: new HttpChangeSetGateway(apiClient),
  fileDiffs: new HttpFileDiffGateway(apiClient),
  notifications: new HttpNotificationGateway(apiClient),
  settings: new HttpSettingsGateway(apiClient),
  reviewedMarks: new LocalReviewedMarksGateway(() => {
    return window.localStorage
  }),
  languageServers: new HttpLanguageServerGateway(apiClient),
  definitions: new HttpDefinitionGateway(apiClient),
  fileContents: new HttpFileContentGateway(apiClient),
  events: new SocketEventStream(appGlobals.wsUrl),
})
