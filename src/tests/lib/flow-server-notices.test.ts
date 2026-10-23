import { describe, expect, it } from 'vitest'
import {
  type FlowServerNotice,
  type FlowServerNoticeKind,
  FlowServerNotices,
} from '@/src/lib/flow-server-notices.ts'

const notice = (kind: FlowServerNoticeKind): FlowServerNotice => {
  return { kind, key: kind, server: kind, languageServer: null, error: '' }
}

const TRACING: FlowServerNoticeKind[] = ['starting', 'indexing']

const ACTIONABLE: FlowServerNoticeKind[] = [
  'offer',
  'blocked',
  'installing',
  'install-failed',
  'needs-checkout',
  'failed',
  'unsupported',
]

describe('FlowServerNotices.isTracing', () => {
  it('is true only for starting and indexing servers', () => {
    for (const kind of TRACING) {
      expect(FlowServerNotices.isTracing(notice(kind))).toBe(true)
    }
    for (const kind of ACTIONABLE) {
      expect(FlowServerNotices.isTracing(notice(kind))).toBe(false)
    }
  })
})

describe('FlowServerNotices.shown', () => {
  it('leaves out starting and indexing notices and keeps the others in order', () => {
    const notices = [...TRACING, ...ACTIONABLE].map(notice)

    expect(
      FlowServerNotices.shown(notices).map(({ kind }) => {
        return kind
      }),
    ).toEqual(ACTIONABLE)
  })

  it('shows nothing while every server is still tracing', () => {
    expect(FlowServerNotices.shown(TRACING.map(notice))).toEqual([])
  })
})
