import { create } from 'zustand'
import { SettingsSchema, type Settings } from '@/src/lib/settings-schema.ts'

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>()((set) => {
  return {
    ...SettingsSchema.defaults,
    update: (patch) => {
      set((state) => {
        return SettingsSchema.parse({ ...state, ...patch })
      })
    },
  }
})
