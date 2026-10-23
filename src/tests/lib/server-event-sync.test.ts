import { describe, expect, it } from 'vitest'
import { CallFlowGraphs } from '@/src/lib/call-flow.ts'
import { ChangeFlowProgress } from '@/src/lib/change-flow-progress.ts'
import { type Comparison, ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { FlowServerProgress } from '@/src/lib/flow-progress.ts'
import { InMemoryCommentGateway } from '@/src/lib/in-memory-comment-gateway.ts'
import { InMemoryDefinitionGateway } from '@/src/lib/in-memory-definition-gateway.ts'
import { InMemoryEventStream } from '@/src/lib/in-memory-event-stream.ts'
import { InMemoryFileContentGateway } from '@/src/lib/in-memory-file-content-gateway.ts'
import { InMemoryLanguageServerGateway } from '@/src/lib/in-memory-language-server-gateway.ts'
import { InMemoryNotificationGateway } from '@/src/lib/in-memory-notification-gateway.ts'
import { InMemoryReviewSessionGateway } from '@/src/lib/in-memory-review-session-gateway.ts'
import { InMemoryReviewedMarksGateway } from '@/src/lib/in-memory-reviewed-marks-gateway.ts'
import { InMemorySettingsGateway } from '@/src/lib/in-memory-settings-gateway.ts'
import { Services } from '@/src/lib/services.ts'
import { languageServerList } from '@/src/stories/support/language-server-fixture.ts'

const uncommitted: Comparison = { source: ComparisonRules.uncommitted, target: 'main' }
const feature: Comparison = { source: ComparisonRules.branch('feat/flow'), target: 'main' }

const servers: FlowServerProgress[] = [{ server: 'gopls', phase: 'reading', done: 3, total: 9 }]

const unused = () => {
  return Promise.reject(new Error('not used by this test'))
}

const startSync = () => {
  const events = new InMemoryEventStream()
  const comments = new InMemoryCommentGateway()
  const services = new Services({
    workspace: { load: unused },
    branches: { list: unused },
    comments,
    sessions: new InMemoryReviewSessionGateway(comments),
    changeSets: { load: unused },
    changeFlows: {
      load: () => {
        return Promise.resolve({ servers: [], graph: CallFlowGraphs.empty })
      },
    },
    fileDiffs: { load: unused },
    notifications: new InMemoryNotificationGateway(),
    settings: new InMemorySettingsGateway(),
    reviewedMarks: new InMemoryReviewedMarksGateway(),
    languageServers: new InMemoryLanguageServerGateway(languageServerList),
    definitions: new InMemoryDefinitionGateway(() => {
      throw new Error('not used by this test')
    }),
    fileContents: new InMemoryFileContentGateway(new Map()),
    events,
  })
  const stop = services.serverSync.start()
  const progressOf = (comparison: Comparison) => {
    return ChangeFlowProgress.of(services.changeFlowProgress.store.getState(), comparison)
  }
  return { events, stop, progressOf }
}

describe('ServerEventSync change flow progress', () => {
  it('hands progress signals to ChangeFlowProgress per comparison', () => {
    const { events, progressOf } = startSync()
    events.emit({ kind: 'change-flow.progress', comparison: uncommitted, servers })
    events.emit({ kind: 'change-flow.progress', comparison: feature, servers: [] })

    expect(progressOf(uncommitted)).toEqual({ comparison: uncommitted, servers })
    expect(progressOf(feature)).toEqual({ comparison: feature, servers: [] })
  })

  it('clears every progress when the stream resumes', () => {
    const { events, progressOf } = startSync()
    events.emit({ kind: 'change-flow.progress', comparison: uncommitted, servers })
    events.emit({ kind: 'change-flow.progress', comparison: feature, servers })
    events.emit({ kind: 'stream.resumed' })

    expect(progressOf(uncommitted)).toBeNull()
    expect(progressOf(feature)).toBeNull()
  })

  it('stops applying signals after dispose', () => {
    const { events, stop, progressOf } = startSync()
    stop()
    events.emit({ kind: 'change-flow.progress', comparison: uncommitted, servers })

    expect(progressOf(uncommitted)).toBeNull()
  })
})
