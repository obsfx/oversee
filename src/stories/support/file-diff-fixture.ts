import { ChangeStatuses, type FileChange } from '@/src/lib/change-set.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { ImageFiles } from '@/src/lib/image-files.ts'

const SERVICE_OLD = `import { Injectable } from '@nestjs/common'
import { SessionRepository } from '@/src/stories/support/session.repository'
import { TokenSigner } from '@/src/stories/support/token-signer'
import { Logger } from '@/src/stories/logging/logger'

export interface SessionInput {
  userId: string
  device: string
}

@Injectable()
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly signer: TokenSigner,
    private readonly logger: Logger,
  ) {}

  async create(input: SessionInput) {
    const expiresAt = Date.now() + 3600000
    const session = await this.sessions.insert({ ...input, expiresAt })
    this.logger.info('session created', { id: session.id })
    return this.signer.sign(session)
  }

  async refresh(sessionId: string) {
    const session = await this.sessions.findById(sessionId)
    if (!session) {
      throw new Error('session not found')
    }
    session.expiresAt = Date.now() + 3600000
    await this.sessions.update(session)
    return this.signer.sign(session)
  }

  async revoke(sessionId: string) {
    await this.sessions.delete(sessionId)
  }

  async listForUser(userId: string) {
    const sessions = await this.sessions.findByUser(userId)
    return sessions.filter((session) => session.expiresAt > Date.now())
  }

  async revokeAllForUser(userId: string) {
    const sessions = await this.sessions.findByUser(userId)
    for (const session of sessions) {
      await this.sessions.delete(session.id)
    }
  }

  private isExpired(expiresAt: number) {
    return expiresAt < Date.now()
  }

  async cleanup() {
    const all = await this.sessions.findAll()
    const expired = all.filter((session) => this.isExpired(session.expiresAt))
    for (const session of expired) {
      await this.sessions.delete(session.id)
    }
    this.logger.info('expired sessions removed', { count: expired.length })
  }
}
`

const SERVICE_NEW = `import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SessionRepository } from '@/src/stories/support/session.repository'
import { TokenSigner } from '@/src/stories/support/token-signer'
import { Logger } from '@/src/stories/logging/logger'
import { SessionNotFoundError } from '@/src/stories/support/session.errors'

export interface SessionInput {
  userId: string
  device: string
  ipAddress?: string
}

@Injectable()
export class SessionService {
  private readonly ttl: number

  constructor(
    private readonly sessions: SessionRepository,
    private readonly signer: TokenSigner,
    private readonly logger: Logger,
    config: ConfigService,
  ) {
    this.ttl = config.getOrThrow<number>('SESSION_TTL_MS')
  }

  async create(input: SessionInput) {
    const expiresAt = this.nextExpiry()
    const session = await this.sessions.insert({ ...input, expiresAt })
    this.logger.info('session created', { id: session.id, device: input.device })
    return this.signer.sign(session)
  }

  async refresh(sessionId: string) {
    const session = await this.sessions.findById(sessionId)
    if (!session) {
      throw new SessionNotFoundError(sessionId)
    }
    session.expiresAt = this.nextExpiry()
    await this.sessions.update(session)
    return this.signer.sign(session)
  }

  async revoke(sessionId: string) {
    await this.sessions.delete(sessionId)
  }

  async listForUser(userId: string) {
    const sessions = await this.sessions.findByUser(userId)
    return sessions.filter((session) => session.expiresAt > Date.now())
  }

  async revokeAllForUser(userId: string) {
    await this.sessions.deleteByUser(userId)
    this.logger.info('sessions revoked', { userId })
  }

  private nextExpiry() {
    return Date.now() + this.ttl
  }

  private isExpired(expiresAt: number) {
    return expiresAt < Date.now()
  }

  async cleanup() {
    const removed = await this.sessions.deleteExpired(Date.now())
    this.logger.info('expired sessions removed', { count: removed })
  }
}
`

const WORKFLOW_OLD = `name: production-ci

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh production
`

const WORKFLOW_NEW = `name: production-ci

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh production
`

const TEXT_OLD = `# runtime configuration
PORT=3000
DATABASE_URL=postgres://localhost:5432/now
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
`

const TEXT_NEW = `# runtime configuration
PORT=3000
DATABASE_URL=postgres://localhost:5432/now
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug

# sessions
SESSION_TTL_MS=3600000
SESSION_CLEANUP_CRON=*/15 * * * *
`

export const LARGE_FILE_PATH = 'src/generated/graphql/typings.d.ts'
const LARGE_FILE_LINES = 3000
const LARGE_FILE_CHANGE_EVERY = 150

const largeLine = (index: number, changed: boolean) => {
  return changed
    ? `export type Generated${index} = { id: string; value${index}: number; updatedAt: string }`
    : `export type Generated${index} = { id: string; value${index}: number }`
}

const largePair = () => {
  const indexes = Array.from({ length: LARGE_FILE_LINES }, (_, index) => {
    return index + 1
  })
  return {
    oldContents: `${indexes
      .map((index) => {
        return largeLine(index, false)
      })
      .join('\n')}\n`,
    newContents: `${indexes
      .map((index) => {
        return largeLine(index, index % LARGE_FILE_CHANGE_EVERY === 0)
      })
      .join('\n')}\n`,
  }
}

const sampleImage = (fill: string, label: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='140'><rect width='240' height='140' rx='16' fill='${fill}'/><text x='120' y='78' font-family='sans-serif' font-size='22' fill='white' text-anchor='middle'>${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const SAMPLE_IMAGES = {
  before: sampleImage('#b25d57', 'before'),
  after: sampleImage('#4f8a68', 'after'),
}

const BINARY = /\.(png|jpe?g|gif|mp4|webp|ico)$/

const pairFor = (path: string) => {
  if (path === LARGE_FILE_PATH) {
    return largePair()
  }
  if (/\.(ts|tsx|js)$/.test(path)) {
    return { oldContents: SERVICE_OLD, newContents: SERVICE_NEW }
  }
  if (/\.ya?ml$/.test(path)) {
    return { oldContents: WORKFLOW_OLD, newContents: WORKFLOW_NEW }
  }
  return { oldContents: TEXT_OLD, newContents: TEXT_NEW }
}

export const fileDiffFor = ({ path, status }: FileChange): FileDiff => {
  if (BINARY.test(path)) {
    return {
      binary: true,
      oldFile: null,
      newFile: null,
      images: ImageFiles.isImage(path)
        ? ImageFiles.pair({ path, status, additions: 0, deletions: 0 }, (side) => {
            return side === 'old' ? SAMPLE_IMAGES.before : SAMPLE_IMAGES.after
          })
        : null,
    }
  }
  const { oldContents, newContents } = pairFor(path)
  const diff: FileDiff = { binary: false, images: null, oldFile: null, newFile: null }
  if (ChangeStatuses.hasOldSide(status)) {
    diff.oldFile = { name: path, contents: oldContents, cacheKey: `story::old::${path}` }
  }
  if (ChangeStatuses.hasNewSide(status)) {
    diff.newFile = { name: path, contents: newContents, cacheKey: `story::new::${path}` }
  }
  return diff
}
