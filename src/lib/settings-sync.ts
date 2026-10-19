import type { SettingsGateway } from '@/src/lib/settings-gateway.ts'
import { SettingsSchema, type Settings } from '@/src/lib/settings-schema.ts'

export interface SettingsStore {
  getState(): Settings
  setState(settings: Settings): void
  subscribe(listener: () => void): () => void
}

export class SettingsSync {
  private readonly gateway: SettingsGateway
  private persisted: Settings = SettingsSchema.defaults
  private writes: Promise<void> = Promise.resolve()

  constructor(gateway: SettingsGateway) {
    this.gateway = gateway
  }

  private static changes(persisted: Settings, current: Settings): Partial<Settings> {
    const keys = Object.keys(SettingsSchema.defaults) as (keyof Settings)[]
    const changed = keys.filter((key) => {
      return current[key] !== persisted[key]
    })
    return Object.fromEntries(
      changed.map((key) => {
        return [key, current[key]]
      }),
    )
  }

  async start(store: SettingsStore) {
    this.persisted = await this.loadOrDefaults()
    store.setState(this.persisted)
    store.subscribe(() => {
      this.writes = this.writes.then(() => {
        return this.flush(store.getState())
      })
    })
  }

  private async loadOrDefaults() {
    try {
      const settings = await this.gateway.load()
      return settings
    } catch {
      return SettingsSchema.defaults
    }
  }

  private async flush(current: Settings) {
    const patch = SettingsSync.changes(this.persisted, current)
    if (Object.keys(patch).length === 0) {
      return
    }
    try {
      await this.gateway.save(patch)
      this.persisted = { ...this.persisted, ...patch }
    } catch {
      return
    }
  }
}
