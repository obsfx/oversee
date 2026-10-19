import { AsyncResource } from '@/src/lib/async-resource.ts'
import type { BranchGateway, BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ChangeSetGateway } from '@/src/lib/change-set-gateway.ts'
import type { CommentGateway } from '@/src/lib/comment-gateway.ts'
import { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import {
  type FileDiff,
  type FileDiffGateway,
  type FileDiffRequest,
  FileDiffRequests,
} from '@/src/lib/file-diff-gateway.ts'
import { ResourceCache } from '@/src/lib/resource-cache.ts'
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
  fileDiffs: FileDiffGateway
  notifications: NotificationGateway
  settings: SettingsGateway
  events: EventStream
}

export class Services {
  readonly workspace: AsyncResource<WorkspaceInfo>
  readonly branches: AsyncResource<BranchList>
  readonly comments: ReviewComments
  readonly sessions: ReviewSessions
  readonly changeSets: ComparisonCache<ChangeSet>
  readonly fileDiffs: ResourceCache<FileDiffRequest, FileDiff>
  readonly notifications: Notifications
  readonly settings: SettingsSync
  readonly serverSync: ServerEventSync

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
    this.fileDiffs = new ResourceCache(FileDiffRequests.key, (request) => {
      return gateways.fileDiffs.load(request)
    })
    this.notifications = new Notifications(gateways.notifications)
    this.settings = new SettingsSync(gateways.settings)
    this.serverSync = new ServerEventSync(
      gateways.events,
      this.sessions,
      this.comments,
      this.notifications,
      new WorkspaceRefresh(this.branches, this.changeSets, this.fileDiffs),
    )
  }
}
