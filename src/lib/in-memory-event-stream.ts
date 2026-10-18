import type { EventStream, ServerEvent, ServerEventListener } from '@/src/lib/server-events.ts'

export class InMemoryEventStream implements EventStream {
  private readonly listeners = new Set<ServerEventListener>()

  subscribe(listener: ServerEventListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(event: ServerEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
