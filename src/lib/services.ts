import { AsyncResource } from '@/src/lib/async-resource.ts'
import type { BranchGateway, BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ChangeSetGateway } from '@/src/lib/change-set-gateway.ts'
import type { ChangeFlowGateway } from '@/src/lib/change-flow-gateway.ts'
import { ChangeFlowProgress } from '@/src/lib/change-flow-progress.ts'
import { ChangeFlows } from '@/src/lib/change-flows.ts'
import type { CommentGateway } from '@/src/lib/comment-gateway.ts'
import { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import type { DefinitionGateway } from '@/src/lib/definition-gateway.ts'
import { Definitions } from '@/src/lib/definitions.ts'
import {
  type FileContent,
  type FileContentGateway,
  type FileContentRequest,
  FileContentRequests,
} from '@/src/lib/file-content-gateway.ts'
import type { LanguageServerGateway } from '@/src/lib/language-server-gateway.ts'
import { LanguageServers } from '@/src/lib/language-servers.ts'
import {
  type FileDiff,
  type FileDiffGateway,
  type FileDiffRequest,
  FileDiffRequests,
} from '@/src/lib/file-diff-gateway.ts'
import { ResourceCache } from '@/src/lib/resource-cache.ts'
import type { ReviewedMarksGateway } from '@/src/lib/reviewed-marks-gateway.ts'
import type { NotificationGateway } from '@/src/lib/notification-gateway.ts'
import { Notifications } from '@/src/lib/notifications.ts'
import { ReviewComments } from '@/src/lib/review-comments.ts'
import type { ReviewSessionGateway } from '@/src/lib/review-session-gateway.ts'
import { ReviewSessions } from '@/src/lib/review-sessions.ts'
import { ServerEventSync } from '@/src/lib/server-event-sync.ts'
import type { SettingsGateway } from '@/src/lib/settings-gateway.ts'
import { SettingsSync } from '@/src/lib/settings-sync.ts'
import type { EventStream } from '@/src/lib/server-events.ts'
import type { WorkspaceGateway, WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'
import { WorkspaceRefresh } from '@/src/lib/workspace-refresh.ts'

interface Gateways {
  workspace: WorkspaceGateway
  branches: BranchGateway
  comments: CommentGateway
  sessions: ReviewSessionGateway
  changeSets: ChangeSetGateway
  changeFlows: ChangeFlowGateway
  fileDiffs: FileDiffGateway
  notifications: NotificationGateway
  settings: SettingsGateway
  reviewedMarks: ReviewedMarksGateway
  languageServers: LanguageServerGateway
  definitions: DefinitionGateway
  fileContents: FileContentGateway
  events: EventStream
}

export class Services {
  readonly workspace: AsyncResource<WorkspaceInfo>
  readonly branches: AsyncResource<BranchList>
  readonly comments: ReviewComments
  readonly sessions: ReviewSessions
  readonly changeSets: ComparisonCache<ChangeSet>
  readonly changeFlows: ChangeFlows
  readonly changeFlowProgress: ChangeFlowProgress
  readonly fileDiffs: ResourceCache<FileDiffRequest, FileDiff>
  readonly notifications: Notifications
  readonly settings: SettingsSync
  readonly serverSync: ServerEventSync
  readonly reviewedMarks: ReviewedMarksGateway
  readonly languageServers: LanguageServers
  readonly definitions: Definitions
  readonly fileContents: ResourceCache<FileContentRequest, FileContent>

  constructor(gateways: Gateways) {
    this.workspace = new AsyncResource(() => {
      return gateways.workspace.load()
    })
    this.branches = new AsyncResource(() => {
      return gateways.branches.list()
    })
    this.comments = new ReviewComments(gateways.comments)
    this.sessions = new ReviewSessions(gateways.sessions, this.comments)
    this.changeSets = new ComparisonCache((comparison) => {
      return gateways.changeSets.load(comparison)
    })
    this.changeFlowProgress = new ChangeFlowProgress()
    this.changeFlows = new ChangeFlows(gateways.changeFlows, this.changeFlowProgress)
    this.fileDiffs = new ResourceCache(FileDiffRequests.key, (request) => {
      return gateways.fileDiffs.load(request)
    })
    this.notifications = new Notifications(gateways.notifications)
    this.settings = new SettingsSync(gateways.settings)
    this.reviewedMarks = gateways.reviewedMarks
    this.languageServers = new LanguageServers(gateways.languageServers)
    this.definitions = new Definitions(gateways.definitions)
    this.fileContents = new ResourceCache(FileContentRequests.key, (request) => {
      return gateways.fileContents.load(request)
    })
    this.serverSync = new ServerEventSync(
      gateways.events,
      this.sessions,
      this.comments,
      this.notifications,
      new WorkspaceRefresh(
        this.branches,
        this.changeSets,
        this.changeFlows,
        this.fileDiffs,
        this.fileContents,
        this.definitions,
      ),
      this.languageServers,
      this.definitions,
      this.changeFlowProgress,
    )
  }
}
