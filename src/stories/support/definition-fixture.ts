import type { FileSide } from '@/src/lib/change-set.ts'
import type {
  Definition,
  DefinitionLookup,
  DefinitionQuery,
  DefinitionStatus,
} from '@/src/lib/definition-gateway.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { FileContentRequests } from '@/src/lib/file-content-gateway.ts'
import { fixtureContents } from '@/src/stories/support/file-diff-fixture.ts'

const SERVER = 'typescript-language-server'
const SNIPPET_LINES = 12

const REPOSITORY_PATH = 'src/stories/support/session.repository.ts'
const SIGNER_PATH = 'src/stories/support/token-signer.ts'
const ERRORS_PATH = 'src/stories/support/session.errors.ts'
const LOGGER_PATH = 'src/stories/logging/logger.ts'
const STRUCTURED_LOGGER_PATH = 'src/stories/logging/structured-logger.ts'
const INJECTABLE_PATH = 'node_modules/@nestjs/common/decorators/core/injectable.decorator.d.ts'
const LIB_PATH =
  '/Users/dev/.nvm/versions/node/v22.11.0/lib/node_modules/typescript/lib/lib.es5.d.ts'

const REPOSITORY = `import type { Session } from '@/src/stories/support/session'

export interface SessionRecord extends Session {
  id: string
  expiresAt: number
}

export class SessionRepository {
  async insert(session: Omit<SessionRecord, 'id'>): Promise<SessionRecord> {
    return { ...session, id: crypto.randomUUID() }
  }

  async findById(id: string): Promise<SessionRecord | null> {
    return null
  }

  async findByUser(userId: string): Promise<SessionRecord[]> {
    return []
  }

  async update(session: SessionRecord): Promise<void> {}

  async delete(id: string): Promise<void> {}

  async deleteByUser(userId: string): Promise<void> {}

  async deleteExpired(now: number): Promise<number> {
    return 0
  }
}
`

const SIGNER = `import { createHmac } from 'node:crypto'

export class TokenSigner {
  constructor(private readonly secret: string) {}

  sign(payload: { id: string }) {
    return createHmac('sha256', this.secret).update(payload.id).digest('hex')
  }
}
`

const ERRORS = `export class SessionNotFoundError extends Error {
  constructor(readonly sessionId: string) {
    super(\`session \${sessionId} not found\`)
    this.name = 'SessionNotFoundError'
  }
}
`

const LOGGER = `export interface LogFields {
  [key: string]: unknown
}

export class Logger {
  constructor(private readonly scope: string) {}

  debug(message: string, fields: LogFields = {}) {
    this.write('debug', message, fields)
  }

  info(message: string, fields: LogFields = {}) {
    this.write('info', message, fields)
  }

  private write(level: string, message: string, fields: LogFields) {
    console.log(JSON.stringify({ level, scope: this.scope, message, ...fields }))
  }
}
`

const STRUCTURED_LOGGER = `import { Logger, type LogFields } from '@/src/stories/logging/logger'

export class StructuredLogger extends Logger {
  info(message: string, fields: LogFields = {}) {
    super.info(message, { ...fields, at: new Date().toISOString() })
  }
}
`

const INJECTABLE = `import { ScopeOptions } from '../../interfaces/scope-options.interface';
export declare function Injectable(options?: ScopeOptions): ClassDecorator;
export declare function mixin<T>(mixinClass: Type<T>): any;
`

const LIB = `interface DateConstructor {
    new (): Date;
    new (value: number | string): Date;
    readonly prototype: Date;
    parse(s: string): number;
    UTC(year: number, monthIndex: number, date?: number): number;
    now(): number;
}

declare var Date: DateConstructor;
`

const LARGE_PATH = 'src/stories/support/large-typings.d.ts'
const LARGE_LINES = 4600

const LARGE = Array.from({ length: LARGE_LINES }, (_, index) => {
  const line = index + 1
  if (line % 40 === 0) {
    return `export interface Generated${line} { id: string; createdAt: string; updatedAt: string; owner: { id: string; name: string; email: string; roles: string[] } }`
  }
  return `  value${line}: number`
}).join('\n')

const FILES: [string, boolean, string][] = [
  [LARGE_PATH, false, LARGE],
  [REPOSITORY_PATH, false, REPOSITORY],
  [SIGNER_PATH, false, SIGNER],
  [ERRORS_PATH, false, ERRORS],
  [LOGGER_PATH, false, LOGGER],
  [STRUCTURED_LOGGER_PATH, false, STRUCTURED_LOGGER],
  [INJECTABLE_PATH, false, INJECTABLE],
  [LIB_PATH, true, LIB],
]

export const definitionFiles: ReadonlyMap<string, string> = new Map(
  FILES.map(([path, external, contents]) => {
    return [FileContentRequests.key({ path, external }), contents]
  }),
)

const wordAt = (contents: string, line: number, character: number) => {
  const text = contents.split('\n')[line - 1] ?? ''
  let start = character
  let end = character
  while (start > 0 && /\w/.test(text[start - 1])) {
    start -= 1
  }
  while (end < text.length && /\w/.test(text[end])) {
    end += 1
  }
  return text.slice(start, end)
}

const definitionIn = (
  path: string,
  external: boolean,
  side: FileSide,
  contents: string,
  marker: string,
): Definition => {
  const lines = contents.split('\n')
  const index = Math.max(
    0,
    lines.findIndex((text) => {
      return text.includes(marker)
    }),
  )
  return {
    path,
    external,
    side,
    line: index + 1,
    snippet: { startLine: index + 1, lines: lines.slice(index, index + SNIPPET_LINES) },
  }
}

export const lookupWith = (
  status: DefinitionStatus,
  definitions: Definition[] = [],
): DefinitionLookup => {
  let error = ''
  if (status === 'failed') {
    error = `${SERVER} exited: fatal error: out of memory`
  }
  return { status, server: SERVER, error, definitions }
}

const definitionsFor = (query: DefinitionQuery, word: string): Definition[] | null => {
  const own = fixtureContents(query.path, 'new')
  switch (word) {
    case 'nextExpiry':
    case 'isExpired':
    case 'ttl':
      return [definitionIn(query.path, false, 'new', own, `private ${word}`)]
    case 'SessionRepository':
    case 'insert':
    case 'findById':
    case 'findByUser':
    case 'deleteByUser':
    case 'deleteExpired':
      return [definitionIn(REPOSITORY_PATH, false, 'new', REPOSITORY, word)]
    case 'TokenSigner':
    case 'sign':
      return [definitionIn(SIGNER_PATH, false, 'new', SIGNER, word)]
    case 'SessionNotFoundError':
      return [definitionIn(ERRORS_PATH, false, 'new', ERRORS, word)]
    case 'Logger':
      return [definitionIn(LOGGER_PATH, false, 'new', LOGGER, 'export class Logger')]
    case 'info':
      return [
        definitionIn(LOGGER_PATH, false, 'new', LOGGER, 'info(message'),
        definitionIn(STRUCTURED_LOGGER_PATH, false, 'new', STRUCTURED_LOGGER, 'info(message'),
      ]
    case 'Injectable':
      return [definitionIn(INJECTABLE_PATH, false, 'new', INJECTABLE, word)]
    case 'Date':
    case 'now':
      return [
        definitionIn(LIB_PATH, true, 'new', LIB, word === 'Date' ? 'declare var Date' : 'now()'),
      ]
    default:
      return null
  }
}

export const resolveDefinition = (
  query: DefinitionQuery,
  forced: DefinitionStatus | null = null,
): DefinitionLookup => {
  if (!/\.(ts|tsx|js)$/.test(query.path)) {
    return { status: 'unsupported', server: '', error: '', definitions: [] }
  }
  if (forced && forced !== 'ready') {
    return lookupWith(forced)
  }
  const word = wordAt(fixtureContents(query.path, query.side), query.line, query.character)
  if (word === 'ConfigService') {
    return lookupWith('indexing')
  }
  if (word === 'getOrThrow') {
    return lookupWith('starting')
  }
  return lookupWith('ready', definitionsFor(query, word) ?? [])
}

const SAMPLE_QUERY: DefinitionQuery = {
  comparison: { source: { kind: 'uncommitted' }, target: 'main' },
  side: 'new',
  path: 'scripts/expire_password.ts',
  line: 1,
  character: 0,
}

export const definitionLookups = {
  single: lookupWith('ready', definitionsFor(SAMPLE_QUERY, 'SessionRepository') ?? []),
  sameFile: lookupWith('ready', definitionsFor(SAMPLE_QUERY, 'nextExpiry') ?? []),
  several: lookupWith('ready', definitionsFor(SAMPLE_QUERY, 'info') ?? []),
  external: lookupWith('ready', definitionsFor(SAMPLE_QUERY, 'Date') ?? []),
  empty: lookupWith('ready'),
  notInstalled: lookupWith('not-installed'),
  needsCheckout: lookupWith('needs-checkout'),
  starting: lookupWith('starting'),
  indexing: lookupWith('indexing'),
  failed: lookupWith('failed'),
  unsupported: {
    status: 'unsupported',
    server: '',
    error: '',
    definitions: [],
  } as DefinitionLookup,
}

const reveal = (line: number) => {
  return { side: 'new' as const, line, requestedAt: 0 }
}

export const definitionTabs = {
  diff: {
    id: 'repo::scripts/expire_password.ts',
    path: 'scripts/expire_password.ts',
    external: false,
    reveal: reveal(58),
    openerId: 'review',
  },
  file: {
    id: `repo::${REPOSITORY_PATH}`,
    path: REPOSITORY_PATH,
    external: false,
    reveal: reveal(8),
    openerId: 'review',
  },
  large: {
    id: `repo::${LARGE_PATH}`,
    path: LARGE_PATH,
    external: false,
    reveal: reveal(3800),
    openerId: 'review',
  },
  external: {
    id: `external::${LIB_PATH}`,
    path: LIB_PATH,
    external: true,
    reveal: reveal(10),
    openerId: 'review',
  },
} satisfies Record<string, DefinitionTab>
