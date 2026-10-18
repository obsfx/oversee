import type { BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { FileDiff, FileDiffRequest } from '@/src/lib/file-diff-gateway.ts'
import { InMemoryCommentGateway } from '@/src/lib/in-memory-comment-gateway.ts'
import { Services } from '@/src/lib/services.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { fileDiffFor } from '@/src/stories/support/file-diff-fixture.ts'

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
  },
  {
    id: 'c2',
    filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
    range: { start: 53, end: 56, side: 'additions', endSide: 'additions' },
    body: 'Nice, one query instead of N.\n\n- does `deleteByUser` emit the audit event?\n- should this return the count?',
    createdAt: Date.now() - 8 * MINUTE,
    updatedAt: Date.now() - 8 * MINUTE,
  },
  {
    id: 'c3',
    filePath: '.github/workflows/production-ci.yml',
    range: { start: 16, end: 17, side: 'additions', endSide: 'additions' },
    body: 'Pin the node version in `.nvmrc` instead so local and CI match.',
    createdAt: Date.now() - 3 * MINUTE,
    updatedAt: Date.now() - 3 * MINUTE,
  },
  {
    id: 'c4',
    filePath: 'src/generated/graphql/typings.d.ts',
    range: { start: 2850, end: 2850, side: 'additions', endSide: 'additions' },
    body: 'Generated, but should `updatedAt` be a `Date` scalar instead of **string**?',
    createdAt: Date.now() - 1 * MINUTE,
    updatedAt: Date.now() - 1 * MINUTE,
  },
]

interface StoryServicesOptions {
  branches?: () => Promise<BranchList>
  comments?: ReviewComment[]
  changeSets?: () => Promise<ChangeSet>
  fileDiffs?: (request: FileDiffRequest) => Promise<FileDiff>
}

export const createStoryServices = ({
  branches = () => {
    return Promise.resolve(branchList)
  },
  comments = reviewComments,
  changeSets = () => {
    return Promise.resolve(changeSet)
  },
  fileDiffs = ({ change }) => {
    return Promise.resolve(fileDiffFor(change))
  },
}: StoryServicesOptions = {}) => {
  return new Services({
    branches: { list: branches },
    comments: new InMemoryCommentGateway(comments),
    changeSets: { load: changeSets },
    fileDiffs: { load: fileDiffs },
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
