import type { DefinitionLookupState } from '@/src/hooks/use-definition-lookup.ts'
import { ApiError } from '@/src/lib/api-client.ts'
import type { ChangeSet, FileChange } from '@/src/lib/change-set.ts'
import type {
  Definition,
  DefinitionLookup,
  DefinitionStatus,
} from '@/src/lib/definition-gateway.ts'
import { type DefinitionTab, DefinitionTabs } from '@/src/lib/definition-tabs.ts'
import { FileContentRequests } from '@/src/lib/file-content-gateway.ts'
import { InMemoryFileContentGateway } from '@/src/lib/in-memory-file-content-gateway.ts'
import type { Services } from '@/src/lib/services.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import {
  definitionFiles,
  definitionLookups,
  definitionTabs,
  lookupWith,
} from '@/src/stories/support/definition-fixture.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'

export type StressData = 'demo' | 'worst' | 'empty' | 'one' | 'many'

export const stressDataOptions: readonly StressData[] = ['demo', 'worst', 'empty', 'one', 'many']

export const stressDataLabels: Record<StressData, string> = {
  demo: 'Demo data',
  worst: 'Worst case',
  empty: 'Empty',
  one: 'One',
  many: 'Many',
}

interface StressPopoverCase {
  label: string
  state: DefinitionLookupState
}

interface StressDataset {
  tabs: DefinitionTab[]
  activeId: string
  changeSet: ChangeSet
  files: ReadonlyMap<string, string>
  popovers: StressPopoverCase[]
}

const BILLING_INDEX = 'src/modules/billing/index.ts'
const USERS_INDEX = 'src/modules/users/index.ts'
const SESSIONS_INDEX = 'src/modules/sessions/index.ts'
const PREFERENCES_CONTROLLER =
  'src/modules/notifications/user-notification-preferences.controller.ts'
const PREFERENCES_SPEC =
  'src/modules/notifications/user-notification-preferences.controller.spec.ts'
const GERMAN_MESSAGES = 'src/i18n/de-DE/Benachrichtigungseinstellungen.json'
const MINIFIED = 'node_modules/chart.js/dist/chart.umd.min.js'
const PNPM_INJECTABLE =
  '/Users/aleksandra.wisniewska-kowalczyk/Library/pnpm/store/v3/node_modules/.pnpm/@nestjs+common@10.4.15_class-transformer@0.5.1_class-validator@0.14.1_reflect-metadata@0.2.2_rxjs@7.8.1/node_modules/@nestjs/common/decorators/core/injectable.decorator.d.ts'
const DOM_LIB =
  '/Users/aleksandra.wisniewska-kowalczyk/Library/pnpm/store/v3/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts'
const WINDOWS_GO =
  'C:\\Users\\aleksandra\\go\\pkg\\mod\\github.com\\coder\\websocket@v1.8.12\\conn.go'

const DOM_LIB_LINES = 29_000
const DOM_LIB_TARGET = 28_431

const LONG_SIGNATURE =
  '  async updateNotificationPreferencesForWorkspaceMember(workspaceId: WorkspaceId, memberId: MemberId, preferences: Partial<NotificationPreferences>): Promise<Result<NotificationPreferences, PreferencesUpdateError>> {'

const MINIFIED_CHUNK =
  '!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).Chart=e()}(this,(function(){"use strict";var t=Object.freeze({__proto__:null,get Colors(){return Go},get Decimation(){return Qo},get Filler(){return ma},get Legend(){return ya}});'

const LONG_ERROR =
  'start typescript-language-server: initialize: read |0: file already closed: /Users/aleksandra.wisniewska-kowalczyk/.oversee/lsp/typescript-language-server/4.3.4/node_modules/typescript-language-server/lib/cli.mjs:2 exited with status 1\nError: Cannot find module typescript/lib/tsserver.js'

const tabOf = (path: string, external: boolean, line: number): DefinitionTab => {
  return {
    id: DefinitionTabs.idOf({ path, external }),
    path,
    external,
    reveal: { side: 'new', line, requestedAt: 0 },
    openerId: DefinitionTabs.reviewId,
  }
}

const definitionOf = (
  path: string,
  line: number,
  lines: string[],
  external = false,
): Definition => {
  return {
    path,
    external,
    side: 'new',
    line,
    snippet: { startLine: line, lines },
  }
}

const ready = (definitions: Definition[]): DefinitionLookupState => {
  return { status: 'ready', lookup: lookupWith('ready', definitions) }
}

const statusOf = (
  status: DefinitionStatus,
  overrides: Partial<DefinitionLookup> = {},
): DefinitionLookupState => {
  return { status: 'ready', lookup: { ...lookupWith(status), ...overrides } }
}

const changeOf = (path: string): FileChange => {
  return { path, status: 'modified', additions: 12, deletions: 3, revision: path }
}

const domLib = () => {
  const lines = ['/// <reference no-default-lib="true"/>']
  for (let index = 1; index < DOM_LIB_LINES; index += 1) {
    if (index % 40 === 0) {
      lines.push(`interface HTMLElementEventMap${index} extends ElementEventMap {`)
    } else if (index % 40 === 39) {
      lines.push('}')
    } else {
      lines.push(`    readonly "pointerrawupdate${index}": PointerEvent;`)
    }
  }
  lines[DOM_LIB_TARGET - 1] =
    '    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;'
  return lines.join('\n')
}

const manyDefinitions = () => {
  return Array.from({ length: 128 }, (_, index) => {
    return definitionOf(
      DOM_LIB,
      DOM_LIB_TARGET + index * 7,
      [
        '    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;',
      ],
      true,
    )
  })
}

const repoFile = (path: string) => {
  return FileContentRequests.key({ path, external: false })
}

const externalFile = (path: string) => {
  return FileContentRequests.key({ path, external: true })
}

const demo = (): StressDataset => {
  return {
    tabs: [definitionTabs.diff, definitionTabs.file, definitionTabs.external],
    activeId: definitionTabs.file.id,
    changeSet,
    files: definitionFiles,
    popovers: [
      { label: 'Single', state: { status: 'ready', lookup: definitionLookups.single } },
      { label: 'Several', state: { status: 'ready', lookup: definitionLookups.several } },
      { label: 'External', state: { status: 'ready', lookup: definitionLookups.external } },
      { label: 'Indexing', state: { status: 'ready', lookup: definitionLookups.indexing } },
      { label: 'Failed', state: { status: 'ready', lookup: definitionLookups.failed } },
    ],
  }
}

const worst = (): StressDataset => {
  const files = new Map(definitionFiles)
  files.set(
    repoFile(BILLING_INDEX),
    "export * from './billing.service'\nexport * from './billing.module'\n",
  )
  files.set(
    repoFile(USERS_INDEX),
    "export * from './users.service'\r\nexport * from './users.module'\r\nexport { UsersRepository } from './users.repository'\r\n",
  )
  files.set(repoFile(SESSIONS_INDEX), "export * from './sessions.service'\n")
  files.set(
    repoFile(PREFERENCES_CONTROLLER),
    Array.from({ length: 60 }, (_, index) => {
      return index === 41 ? LONG_SIGNATURE : `  // preferences line ${index + 1}`
    }).join('\n'),
  )
  files.set(
    repoFile(GERMAN_MESSAGES),
    `{\n  "Benachrichtigungseinstellungen": "Benachrichtigungseinstellungen f\u00fcr Arbeitsbereichsmitglieder",\n  "greeting": "\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0643\u0645 \u0641\u064a \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0639\u0645\u0644 \u{1f469}\u{1f3fd}\u200d\u{1f4bb}"\n}\n`,
  )
  files.set(repoFile(MINIFIED), MINIFIED_CHUNK.repeat(400))
  files.set(
    externalFile(PNPM_INJECTABLE),
    "import { ScopeOptions } from '../../interfaces/scope-options.interface';\nexport type InjectableOptions = ScopeOptions;\nexport declare function Injectable(options?: InjectableOptions): ClassDecorator;\n",
  )
  files.set(externalFile(DOM_LIB), domLib())
  files.set(
    externalFile(WINDOWS_GO),
    'package websocket\n\n// Read reads a message from the connection.\nfunc (c *Conn) Read(ctx context.Context) (MessageType, []byte, error) {\n\ttyp, r, err := c.Reader(ctx)\n\tif err != nil {\n\t\treturn 0, nil, err\n\t}\n\tb, err := io.ReadAll(r)\n\treturn typ, b, err\n}\n',
  )
  return {
    tabs: [
      tabOf(BILLING_INDEX, false, 120),
      tabOf(USERS_INDEX, false, 3),
      tabOf(SESSIONS_INDEX, false, 1),
      tabOf(PREFERENCES_CONTROLLER, false, 42),
      tabOf(PREFERENCES_SPEC, false, 18),
      tabOf(GERMAN_MESSAGES, false, 2),
      tabOf(MINIFIED, false, 1),
      tabOf(PNPM_INJECTABLE, true, 3),
      tabOf(DOM_LIB, true, DOM_LIB_TARGET),
      tabOf(WINDOWS_GO, true, 4),
    ],
    activeId: DefinitionTabs.idOf({ path: PNPM_INJECTABLE, external: true }),
    changeSet: { changes: [...changeSet.changes, changeOf(PREFERENCES_SPEC)] },
    files,
    popovers: [
      {
        label: 'Long name, long signature, 128 results',
        state: ready([
          definitionOf(PREFERENCES_SPEC, 1284, [LONG_SIGNATURE]),
          ...manyDefinitions().slice(1),
        ]),
      },
      {
        label: 'Five digit line in lib.dom.d.ts',
        state: ready([
          definitionOf(
            DOM_LIB,
            DOM_LIB_TARGET,
            [
              '    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;',
            ],
            true,
          ),
        ]),
      },
      {
        label: 'pnpm store path',
        state: ready([
          definitionOf(
            PNPM_INJECTABLE,
            3,
            ['export declare function Injectable(options?: InjectableOptions): ClassDecorator;'],
            true,
          ),
        ]),
      },
      {
        label: 'Windows path, tab indented Go',
        state: ready([definitionOf(WINDOWS_GO, 5, ['\ttyp, r, err := c.Reader(ctx)'], true)]),
      },
      {
        label: 'Minified line',
        state: ready([definitionOf(MINIFIED, 1, [MINIFIED_CHUNK.repeat(6)])]),
      },
      {
        label: 'Snippet could not be read',
        state: ready([definitionOf(GERMAN_MESSAGES, 2, [])]),
      },
      {
        label: 'RTL text and emoji in code',
        state: ready([
          definitionOf(GERMAN_MESSAGES, 3, [
            `  "greeting": "\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0643\u0645 \u0641\u064a \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0639\u0645\u0644 \u{1f469}\u{1f3fd}\u200d\u{1f4bb}"`,
          ]),
        ]),
      },
      {
        label: 'Failed with a long error',
        state: statusOf('failed', { error: LONG_ERROR }),
      },
      {
        label: 'Request failed',
        state: {
          status: 'failed',
          error: new ApiError(
            '/api/definitions?source=feature%2Fuser-notification-preferences-for-workspace-members&target=main&side=new&path=src%2Fmodules%2Fnotifications%2Fuser-notification-preferences.controller.spec.ts&line=1284&character=37',
            'internal server error',
            500,
          ),
        },
      },
      {
        label: 'Not installed, long server id',
        state: statusOf('not-installed', { server: 'kotlin-language-server' }),
      },
    ],
  }
}

const empty = (): StressDataset => {
  return {
    tabs: [],
    activeId: DefinitionTabs.reviewId,
    changeSet,
    files: definitionFiles,
    popovers: [
      { label: 'No definition found', state: statusOf('ready') },
      { label: 'Unsupported file', state: statusOf('unsupported', { server: '' }) },
    ],
  }
}

const one = (): StressDataset => {
  return {
    tabs: [definitionTabs.file],
    activeId: definitionTabs.file.id,
    changeSet,
    files: definitionFiles,
    popovers: [
      { label: 'One definition', state: { status: 'ready', lookup: definitionLookups.single } },
    ],
  }
}

const many = (): StressDataset => {
  const files = new Map(definitionFiles)
  const tabs = Array.from({ length: 40 }, (_, index) => {
    const path = `src/modules/module-${String(index + 1).padStart(2, '0')}/workspace-member.service.ts`
    files.set(repoFile(path), `export class WorkspaceMemberService${index + 1} {}\n`)
    return tabOf(path, false, 1)
  })
  return {
    tabs,
    activeId: tabs[tabs.length - 1].id,
    changeSet,
    files,
    popovers: [{ label: '128 definitions', state: ready(manyDefinitions()) }],
  }
}

const builders: Record<StressData, () => StressDataset> = { demo, worst, empty, one, many }

const built = new Map<StressData, StressDataset>()

export const stressDataset = (data: StressData) => {
  const cached = built.get(data)
  if (cached) {
    return cached
  }
  const dataset = builders[data]()
  built.set(data, dataset)
  return dataset
}

const servicesByData = new Map<StressData, Services>()

export const stressServices = (data: StressData) => {
  const cached = servicesByData.get(data)
  if (cached) {
    return cached
  }
  const dataset = stressDataset(data)
  const services = createLiveStoryServices({
    changeSets: () => {
      return Promise.resolve(dataset.changeSet)
    },
    fileContents: new InMemoryFileContentGateway(dataset.files),
  })
  servicesByData.set(data, services)
  return services
}
