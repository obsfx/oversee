import type { Settings } from '@/src/lib/settings-schema.ts'

export interface SettingsGateway {
  load(): Promise<Settings>
  save(patch: Partial<Settings>): Promise<void>
}
