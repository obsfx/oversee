import { ChangeSets } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { LineRange } from '@/src/lib/line-range.ts'
import type { ReviewSession, SnapshotLine } from '@/src/lib/review-session-gateway.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { fileDiffFor } from '@/src/stories/support/file-diff-fixture.ts'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const additions = (start: number, end: number): LineRange => {
  return { start, end, side: 'additions', endSide: 'additions' }
}

const numbered = (start: number, texts: string[]) => {
  return texts.map((text, index) => {
    return { number: start + index, text }
  })
}

export const snapshotOf = (comment: ReviewComment): SnapshotLine[] => {
  const change = ChangeSets.find(changeSet.changes, comment.filePath)
  if (!change) {
    return []
  }
  const diff = fileDiffFor(change)
  const file = comment.range.endSide === 'deletions' ? diff.oldFile : diff.newFile
  if (!file) {
    return []
  }
  const { start, end } = comment.range
  return numbered(start, file.contents.split('\n').slice(start - 1, end))
}

export const reviewSessions: ReviewSession[] = [
  {
    id: 's3',
    status: 'created',
    createdAt: Date.now() - 4 * HOUR,
    finishedAt: Date.now() - 3 * HOUR,
    comments: [
      {
        id: 's3c1',
        filePath: '.github/workflows/production-ci.yml',
        range: additions(14, 17),
        body: 'Move the node version to `.nvmrc` so local and CI stay in sync.',
        createdAt: Date.now() - 4 * HOUR,
        updatedAt: Date.now() - 4 * HOUR,
        lines: numbered(14, [
          '      - uses: actions/setup-node@v4',
          '        with:',
          '          node-version: 22',
          '          cache: npm',
        ]),
      },
      {
        id: 's3c2',
        filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
        range: additions(24, 24),
        body: 'Validate the **range** here, a `0` would expire every session instantly.',
        createdAt: Date.now() - 4 * HOUR,
        updatedAt: Date.now() - 4 * HOUR,
        lines: numbered(24, ['    const expiresAt = Date.now() + config.sessionTtl']),
      },
    ],
  },
  {
    id: 's2',
    status: 'in-progress',
    createdAt: Date.now() - 1 * DAY - 2 * HOUR,
    finishedAt: Date.now() - 1 * DAY,
    comments: [
      {
        id: 's2c1',
        filePath: 'scripts/expire_password.ts',
        range: additions(6, 9),
        body: 'This loop runs one query per user. Batch it with `whereIn`.',
        createdAt: Date.now() - 1 * DAY - HOUR,
        updatedAt: Date.now() - 1 * DAY - HOUR,
        lines: numbered(6, [
          'for (const user of users) {',
          '  await db.updateTable("users")',
          '    .set({ passwordExpired: true })',
          '    .where("id", "=", user.id).execute()',
        ]),
      },
      {
        id: 's2c2',
        filePath: '.env.template',
        range: additions(3, 3),
        body: 'Add a comment explaining the unit.',
        createdAt: Date.now() - 1 * DAY - HOUR,
        updatedAt: Date.now() - 1 * DAY - HOUR,
        lines: numbered(3, ['SESSION_TTL=3600000']),
      },
    ],
  },
  {
    id: 's1',
    status: 'closed',
    createdAt: Date.now() - 6 * DAY - 2 * HOUR,
    finishedAt: Date.now() - 6 * DAY,
    comments: [
      {
        id: 's1c1',
        filePath: 'src/graphql/resolvers/AdminUser/mutations/deleteMany.ts',
        range: additions(18, 20),
        body: 'Wrap this in a transaction.',
        createdAt: Date.now() - 6 * DAY - HOUR,
        updatedAt: Date.now() - 6 * DAY - HOUR,
        lines: numbered(18, [
          '  await db.deleteFrom("sessions").where("userId", "in", ids).execute()',
          '  await db.deleteFrom("users").where("id", "in", ids).execute()',
          '  return ids.length',
        ]),
      },
    ],
  },
]
