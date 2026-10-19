import type { SettingsGateway } from '@/src/lib/settings-gateway.ts'
import { SettingsSchema, type Settings } from '@/src/lib/settings-schema.ts'

export class InMemorySettingsGateway implements SettingsGateway {
  private stored: Partial<Settings>

  constructor(stored: Partial<Settings> = {}) {
    this.stored = { ...stored }
  }

  load() {
    return Promise.resolve(SettingsSchema.parse(this.stored))
  }

  save(patch: Partial<Settings>) {
    this.stored = { ...this.stored, ...patch }
    return Promise.resolve()
  }
}
