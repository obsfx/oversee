import type { BranchList } from '../../lib/branch-gateway.ts'
import type { ReviewComment } from '../../lib/comment-gateway.ts'
import { InMemoryCommentGateway } from '../../lib/in-memory-comment-gateway.ts'
import { Services } from '../../lib/services.ts'
import { StaticBranchGateway } from '../../lib/static-branch-gateway.ts'

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

export const reviewComments: ReviewComment[] = [
  {
    id: 'c1',
    filePath: 'src/modules/auth/session.service.ts',
    line: 42,
    body: 'This timeout should come from config, not a magic number.',
  },
  {
    id: 'c2',
    filePath: 'src/modules/stories/story.controller.ts',
    line: 15,
    body: 'Missing validation for the slug param.',
  },
  {
    id: 'c3',
    filePath: 'package.json',
    line: 23,
    body: 'Pin this version, the minor bump broke CI last time.',
  },
]

interface StoryServicesOptions {
  branches?: () => Promise<BranchList>
  comments?: ReviewComment[]
}

export const createStoryServices = ({
  branches = () => {
    return Promise.resolve(branchList)
  },
  comments = reviewComments,
}: StoryServicesOptions = {}) => {
  return new Services({
    branches: new StaticBranchGateway(branches),
    comments: new InMemoryCommentGateway(comments),
  })
}

export const neverResolves = () => {
  return new Promise<BranchList>(() => {
    return undefined
  })
}

export const rejectsWith = (message: string) => {
  return () => {
    return Promise.reject(new Error(message))
  }
}
