import type { BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { FileDiff, FileDiffRequest } from '@/src/lib/file-diff-gateway.ts'
import { InMemoryEventStream } from '@/src/lib/in-memory-event-stream.ts'
import { InMemoryNotificationGateway } from '@/src/lib/in-memory-notification-gateway.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { InMemoryCommentGateway } from '@/src/lib/in-memory-comment-gateway.ts'
import { InMemoryReviewSessionGateway } from '@/src/lib/in-memory-review-session-gateway.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { Services } from '@/src/lib/services.ts'
import type { WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { fileDiffFor } from '@/src/stories/support/file-diff-fixture.ts'
import { reviewNotifications } from '@/src/stories/support/notification-fixture.ts'
import { reviewSessions, snapshotOf } from '@/src/stories/support/review-session-fixture.ts'

export const branchList: BranchList = {
  current: 'feat/upgrade-deprecated-versions',
  branches: [
    'main',
    'develop',
    'feat/upgrade-deprecated-versions',
    'feat/comment-threads',
    'fix/session-timeout',
    'chore/bump-deps',
    'release/2026.10',
  ],
  remoteBranches: [
    'origin/main',
    'origin/develop',
    'origin/feat/upgrade-deprecated-versions',
    'origin/configuration',
    'origin/release/2026.09',
  ],
}

const MINUTE = 60 * 1000

export const reviewComments: ReviewComment[] = [
  {
    id: 'c1',
    filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
    range: { start: 24, end: 24, side: 'additions', endSide: 'additions' },
    body: 'Good call reading this from config. Should we validate the **range** too? A `0` here would expire every session instantly.',
    createdAt: Date.now() - 42 * MINUTE,
    updatedAt: Date.now() - 42 * MINUTE,
    lines: [],
    outdatedAt: null,
  },
  {
    id: 'c2',
    filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
    range: { start: 53, end: 56, side: 'additions', endSide: 'additions' },
    body: 'Nice, one query instead of N.\n\n- does `deleteByUser` emit the audit event?\n- should this return the count?',
    createdAt: Date.now() - 8 * MINUTE,
    updatedAt: Date.now() - 8 * MINUTE,
    lines: [],
    outdatedAt: null,
  },
  {
    id: 'c3',
    filePath: '.github/workflows/production-ci.yml',
    range: { start: 16, end: 17, side: 'additions', endSide: 'additions' },
    body: 'Pin the node version in `.nvmrc` instead so local and CI match.',
    createdAt: Date.now() - 3 * MINUTE,
    updatedAt: Date.now() - 3 * MINUTE,
    lines: [],
    outdatedAt: null,
  },
  {
    id: 'c4',
    filePath: 'src/generated/graphql/typings.d.ts',
    range: { start: 2850, end: 2850, side: 'additions', endSide: 'additions' },
    body: 'Generated, but should `updatedAt` be a `Date` scalar instead of **string**?',
    createdAt: Date.now() - 1 * MINUTE,
    updatedAt: Date.now() - 1 * MINUTE,
    lines: [],
    outdatedAt: null,
  },
]

const withSnapshot = (comment: ReviewComment): ReviewComment => {
  return { ...comment, lines: snapshotOf(comment) }
}

export const outdatedReviewComments: ReviewComment[] = [
  withSnapshot({
    id: 'o1',
    filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
    range: { start: 30, end: 32, side: 'additions', endSide: 'additions' },
    body: 'This early return skips the audit log for failed logins.',
    lines: [],
    createdAt: Date.now() - 30 * MINUTE,
    updatedAt: Date.now() - 30 * MINUTE,
    outdatedAt: Date.now() - 6 * MINUTE,
  }),
  withSnapshot({
    id: 'o2',
    filePath: 'scripts/expire_password.ts',
    range: { start: 2, end: 4, side: 'additions', endSide: 'additions' },
    body: 'Batch these updates instead of running one query per user.',
    lines: [],
    createdAt: Date.now() - 20 * MINUTE,
    updatedAt: Date.now() - 20 * MINUTE,
    outdatedAt: Date.now() - 2 * MINUTE,
  }),
]

export const reviewCommentsWithOutdated: ReviewComment[] = [
  ...reviewComments,
  ...outdatedReviewComments,
]

interface StoryServicesOptions {
  workspace?: () => Promise<WorkspaceInfo>
  branches?: () => Promise<BranchList>
  comments?: ReviewComment[]
  sessions?: ReviewSession[]
  notifications?: ReviewNotification[]
  events?: InMemoryEventStream
  commentGateway?: InMemoryCommentGateway
  changeSets?: () => Promise<ChangeSet>
  fileDiffs?: (request: FileDiffRequest) => Promise<FileDiff>
}

export const workspaceInfo: WorkspaceInfo = {
  name: 'now-api',
  path: '/Users/dev/oaks-lab/storyvine/now-api',
}

export const createStoryServices = ({
  workspace = () => {
    return Promise.resolve(workspaceInfo)
  },
  branches = () => {
    return Promise.resolve(branchList)
  },
  comments = reviewComments,
  sessions = reviewSessions,
  notifications = reviewNotifications,
  events = new InMemoryEventStream(),
  commentGateway = new InMemoryCommentGateway(comments),
  changeSets = () => {
    return Promise.resolve(changeSet)
  },
  fileDiffs = ({ change }) => {
    return Promise.resolve(fileDiffFor(change))
  },
}: StoryServicesOptions = {}) => {
  return new Services({
    workspace: { load: workspace },
    branches: { list: branches },
    comments: commentGateway,
    sessions: new InMemoryReviewSessionGateway(commentGateway, sessions, snapshotOf),
    changeSets: { load: changeSets },
    fileDiffs: { load: fileDiffs },
    notifications: new InMemoryNotificationGateway(notifications),
    events,
  })
}

export const neverResolves = <T>() => {
  return new Promise<T>(() => {
    return undefined
  })
}

export const rejectsWith = (message: string) => {
  return () => {
    return Promise.reject(new Error(message))
  }
}
