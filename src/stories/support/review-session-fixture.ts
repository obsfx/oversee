import { ChangeSets } from '@/src/lib/change-set.ts'
import type { ReviewComment, SnapshotLine } from '@/src/lib/comment-gateway.ts'
import { CommentSnapshots } from '@/src/lib/comment-snapshots.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { LineRange } from '@/src/lib/line-range.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { fileDiffFor } from '@/src/stories/support/file-diff-fixture.ts'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const AGENT_DIAGRAM_REPLY = [
  'The mutation fans out in three steps. Firebase runs **before** the database delete, so a failed Firebase call leaves the rows in place and the mutation can be retried safely.',
  '',
  '```mermaid',
  'flowchart LR',
  '  A[deleteAdminUsers] --> B{loadUsers}',
  '  B -->|found| C[firebaseUserDeletion]',
  '  B -->|missing| E[skip id]',
  '  C -->|ok| D[(users table delete)]',
  '  C -->|error| F[keep rows, report id]',
  '```',
  '',
  'Things I checked while tracing it:',
  '',
  '1. `firebaseUserDeletion` batches 1000 uids per call, which is the Admin SDK limit.',
  '2. Rate limit errors are retried twice with a 500ms backoff, other errors are reported per id.',
  '3. The resolver returns the ids that were actually removed, not the requested ones.',
  '',
  '> The order matters: deleting the rows first would orphan Firebase accounts that can still sign in.',
  '',
  'I left the flow as is and added a test for the partial failure case in `deleteAdminUsersCore.test.ts`.',
].join('\n')

const additions = (start: number, end: number): LineRange => {
  return { start, end, side: 'additions', endSide: 'additions' }
}

const numbered = (start: number, texts: string[]) => {
  return texts.map((text, index) => {
    return { number: start + index, text }
  })
}

export const AGENT_LONG_REPLY = [
  '## What changed',
  '',
  'I moved the TTL parsing out of the resolver and into `SessionConfig`, so every caller reads the same validated value. The resolver now only asks for `config.sessionTtl` and never touches the raw env var.',
  '',
  'The validation rejects three cases that used to slip through:',
  '',
  '1. `0` and negative values, which expired every session at once (the bug you pointed at).',
  '2. Values above 30 days, which we never intended to support and which overflowed the cookie `maxAge` on Safari.',
  '3. Non numeric strings such as `1h`, which `Number()` turned into `NaN` and the comparison then treated as "never expires".',
  '',
  '```ts',
  'export class SessionConfig {',
  '  static parse(raw: string | undefined): number {',
  '    const ttl = Number(raw)',
  '    if (!Number.isInteger(ttl) || ttl <= 0 || ttl > MAX_TTL_MS) {',
  "      throw new ConfigError('SESSION_TTL must be a positive number of milliseconds')",
  '    }',
  '    return ttl',
  '  }',
  '}',
  '```',
  '',
  '## Why it throws at startup',
  '',
  'A bad TTL is a deploy mistake, not a runtime condition, so the server refuses to boot instead of falling back to a default. A silent fallback would hide a misconfigured environment until users start getting logged out, which is exactly how the original bug went unnoticed for two weeks.',
  '',
  '```mermaid',
  'sequenceDiagram',
  '  participant Boot',
  '  participant SessionConfig',
  '  participant Resolver',
  '  Boot->>SessionConfig: parse(SESSION_TTL)',
  '  SessionConfig-->>Boot: ttl or ConfigError',
  '  Resolver->>SessionConfig: sessionTtl',
  '  SessionConfig-->>Resolver: validated ttl',
  '```',
  '',
  '## Things I did not change',
  '',
  '- The refresh token TTL still lives in the auth module. It has its own validation and a different unit (seconds), so merging the two would need a migration of the env files.',
  '- `expiresAt` is still computed with `Date.now()`. Injecting a clock would make the tests nicer, but nothing else in this module uses one yet.',
  '',
  '> If you want the clock injected anyway, I can do it in a follow up together with the refresh token cleanup.',
  '',
  'Tests: added `session-config.test.ts` with the three rejected cases and the 30 day boundary, and updated the resolver test to use the parsed config.',
].join('\n')

export const snapshotOf = (comment: ReviewComment): SnapshotLine[] => {
  const change = ChangeSets.find(changeSet.changes, comment.filePath)
  if (!change) {
    return []
  }
  return numbered(
    comment.range.start,
    CommentSnapshots.expectedLines(fileDiffFor(change), comment.range),
  )
}

const comparison: Comparison = {
  source: { kind: 'branch', name: 'feat/upgrade-deprecated-versions' },
  target: 'main',
}

export const reviewSessions: ReviewSession[] = [
  {
    id: 's3',
    comparison,
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
        outdatedAt: null,
        replies: [],
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
        outdatedAt: Date.now() - 3 * HOUR - 10 * 60 * 1000,
        replies: [],
        lines: numbered(24, ['    const expiresAt = Date.now() + config.sessionTtl']),
      },
    ],
  },
  {
    id: 's2',
    comparison,
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
        outdatedAt: null,
        replies: [
          {
            id: 's2c1r1',
            commentId: 's2c1',
            author: 'agent',
            body: [
              'The script runs once per deploy, so the extra query is not on a hot path.',
              '',
              'Keeping it as is. If it ever runs per request:',
              '',
              '- batch the updates with `whereIn`',
              '- or move the flag into the users query',
            ].join('\n'),
            createdAt: Date.now() - 20 * HOUR,
          },
        ],
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
        outdatedAt: null,
        replies: [],
        lines: numbered(3, ['SESSION_TTL=3600000']),
      },
      {
        id: 's2c3',
        filePath: 'src/graphql/resolvers/AdminUser/mutations/deleteMany.ts',
        range: additions(12, 16),
        body: 'How does the deletion flow reach Firebase? Draw it for me.',
        createdAt: Date.now() - 1 * DAY - HOUR,
        updatedAt: Date.now() - 1 * DAY - HOUR,
        outdatedAt: null,
        replies: [
          {
            id: 's2c3r1',
            commentId: 's2c3',
            author: 'agent',
            body: AGENT_DIAGRAM_REPLY,
            createdAt: Date.now() - 19 * HOUR,
          },
        ],
        lines: numbered(12, [
          'export const deleteMany = async (ids: string[]) => {',
          '  const users = await loadUsers(ids)',
          '  await firebaseUserDeletion(users)',
          '  await db.deleteFrom("users").where("id", "in", ids).execute()',
          '}',
        ]),
      },
      {
        id: 's2c4',
        filePath: 'src/graphql/resolvers/User/mutations/auth.ts',
        range: additions(22, 26),
        body: 'Validate the **range** here, a `0` would expire every session instantly. Where should this validation live so the other callers get it too?',
        createdAt: Date.now() - 1 * DAY - HOUR,
        updatedAt: Date.now() - 1 * DAY - HOUR,
        outdatedAt: null,
        replies: [
          {
            id: 's2c4r1',
            commentId: 's2c4',
            author: 'agent',
            body: AGENT_LONG_REPLY,
            createdAt: Date.now() - 18 * HOUR,
          },
        ],
        lines: numbered(22, [
          'export const login = async (input: LoginInput) => {',
          '  const user = await verifyCredentials(input)',
          '  const expiresAt = Date.now() + config.sessionTtl',
          '  return sessions.create({ userId: user.id, expiresAt })',
          '}',
        ]),
      },
    ],
  },
  {
    id: 's1',
    comparison,
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
        outdatedAt: null,
        replies: [],
        lines: numbered(18, [
          '  await db.deleteFrom("sessions").where("userId", "in", ids).execute()',
          '  await db.deleteFrom("users").where("id", "in", ids).execute()',
          '  return ids.length',
        ]),
      },
      {
        id: 's1c2',
        filePath: 'src/stories/support/session.repository.ts',
        range: additions(10, 11),
        body: 'This insert should return the stored row.',
        createdAt: Date.now() - 6 * DAY - HOUR,
        updatedAt: Date.now() - 6 * DAY - HOUR,
        outdatedAt: null,
        replies: [],
        lines: numbered(10, [
          '  async insert(session: Omit<SessionRecord, "id">): Promise<SessionRecord> {',
          '    return { ...session, id: crypto.randomUUID() }',
        ]),
      },
      {
        id: 's1c3',
        filePath: 'src/legacy/session-cleanup.ts',
        range: additions(4, 4),
        body: 'Drop this script once the cron job runs.',
        createdAt: Date.now() - 6 * DAY - HOUR,
        updatedAt: Date.now() - 6 * DAY - HOUR,
        outdatedAt: null,
        replies: [],
        lines: numbered(4, ['export const cleanupSessions = async () => {}']),
      },
    ],
  },
]
