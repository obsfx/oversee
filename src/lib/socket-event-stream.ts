import {
  ServerEvents,
  type EventStream,
  type ServerEvent,
  type ServerEventListener,
} from '@/src/lib/server-events.ts'

const INITIAL_RETRY_MS = 500
const MAX_RETRY_MS = 5000

export class SocketEventStream implements EventStream {
  private readonly url: string
  private readonly listeners = new Set<ServerEventListener>()
  private socket: WebSocket | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryDelay = INITIAL_RETRY_MS
  private lastEventId: number | null = null
  private opened = false

  constructor(url: string) {
    this.url = url
  }

  subscribe(listener: ServerEventListener) {
    this.listeners.add(listener)
    if (this.listeners.size === 1) {
      this.connect()
    }
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.disconnect()
      }
    }
  }

  private connect() {
    const url = new URL(this.url)
    if (this.lastEventId !== null) {
      url.searchParams.set('after', String(this.lastEventId))
    }
    const socket = new WebSocket(url)
    socket.addEventListener('open', () => {
      this.retryDelay = INITIAL_RETRY_MS
      if (this.opened) {
        this.emit({ kind: 'stream.resumed' })
      }
      this.opened = true
    })
    socket.addEventListener('message', (message: MessageEvent<unknown>) => {
      if (typeof message.data === 'string') {
        this.receive(message.data)
      }
    })
    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = null
        this.scheduleReconnect()
      }
    })
    this.socket = socket
  }

  private receive(raw: string) {
    const envelope = ServerEvents.parseEnvelope(raw)
    if (!envelope) {
      return
    }
    if (envelope.id !== null) {
      this.lastEventId = envelope.id
    }
    const event = ServerEvents.fromEnvelope(envelope)
    if (event) {
      this.emit(event)
    }
  }

  private emit(event: ServerEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  private scheduleReconnect() {
    if (this.listeners.size === 0) {
      return
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, this.retryDelay)
    this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS)
  }

  private disconnect() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    const socket = this.socket
    this.socket = null
    socket?.close()
  }
}
