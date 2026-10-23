import { describe, expect, it } from 'vitest'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { ServerEvents } from '@/src/lib/server-events.ts'

const UNCOMMITTED = { source: ':uncommitted', target: 'main' }

const envelope = (payload: unknown) => {
  return JSON.stringify({ kind: 'change-flow.progress', payload, createdAt: 1_700_000_000_000 })
}

const parse = (raw: string) => {
  const parsed = ServerEvents.parseEnvelope(raw)
  if (parsed === null) {
    return null
  }
  return ServerEvents.fromEnvelope(parsed)
}

describe('ServerEvents change-flow.progress', () => {
  it('parses a progress signal without an id', () => {
    const raw = envelope({
      comparison: UNCOMMITTED,
      servers: [
        { server: 'gopls', phase: 'tracing', done: 412, total: 1069 },
        { server: 'pyright', phase: 'done', done: 96, total: 96 },
      ],
    })

    expect(ServerEvents.parseEnvelope(raw)?.id).toBeNull()
    expect(parse(raw)).toEqual({
      kind: 'change-flow.progress',
      comparison: { source: ComparisonRules.uncommitted, target: 'main' },
      servers: [
        { server: 'gopls', phase: 'tracing', done: 412, total: 1069 },
        { server: 'pyright', phase: 'done', done: 96, total: 96 },
      ],
    })
  })

  it('maps a branch comparison and accepts an empty server list', () => {
    const raw = envelope({ comparison: { source: 'feat/flow', target: 'main' }, servers: [] })

    expect(parse(raw)).toEqual({
      kind: 'change-flow.progress',
      comparison: { source: ComparisonRules.branch('feat/flow'), target: 'main' },
      servers: [],
    })
  })

  it('drops bad payloads instead of throwing', () => {
    const server = { server: 'gopls', phase: 'reading', done: 1, total: 4 }
    const payloads = [
      { comparison: UNCOMMITTED, servers: [{ ...server, phase: 'linking' }] },
      { comparison: UNCOMMITTED, servers: [{ ...server, done: -1 }] },
      { comparison: UNCOMMITTED, servers: [{ ...server, total: -4 }] },
      { comparison: UNCOMMITTED, servers: [{ ...server, done: 0.5 }] },
      { comparison: UNCOMMITTED, servers: [{ ...server, server: 3 }] },
      { comparison: UNCOMMITTED, servers: server },
      { comparison: UNCOMMITTED },
      { servers: [server] },
      { comparison: { source: ':uncommitted' }, servers: [server] },
      null,
      undefined,
      'progress',
    ]
    for (const payload of payloads) {
      expect(() => {
        return parse(envelope(payload))
      }).not.toThrow()
      expect(parse(envelope(payload))).toBeNull()
    }
  })

  it('drops envelopes that are not JSON or lack their fields', () => {
    expect(ServerEvents.parseEnvelope('{"kind":')).toBeNull()
    expect(ServerEvents.parseEnvelope(JSON.stringify({ kind: 'change-flow.progress' }))).toBeNull()
    expect(
      ServerEvents.parseEnvelope(
        JSON.stringify({ id: -1, kind: 'change-flow.progress', payload: {}, createdAt: 0 }),
      ),
    ).toBeNull()
  })
})
