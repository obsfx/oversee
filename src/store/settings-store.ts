import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SettingsSchema, type Settings } from '../lib/settings-schema.ts'

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => {
      return {
        ...SettingsSchema.defaults,
        update: (patch) => {
          set(patch)
        },
      }
    },
    {
      name: 'oversee.settings',
      partialize: (state) => {
        return SettingsSchema.parse(state)
      },
      merge: (persisted, current) => {
        return { ...current, ...SettingsSchema.parse(persisted) }
      },
    },
  ),
)
