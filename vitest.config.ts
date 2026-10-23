import { fileURLToPath } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

const STORYBOOK_DIR = fileURLToPath(new URL('./.storybook', import.meta.url))

export default defineConfig((env) => {
  return mergeConfig(
    viteConfig(env),
    defineConfig({
      test: {
        projects: [
          {
            extends: true,
            test: {
              name: 'unit',
              environment: 'node',
              include: ['src/tests/**/*.test.ts'],
            },
          },
          {
            extends: true,
            plugins: [storybookTest({ configDir: STORYBOOK_DIR })],
            test: {
              name: 'storybook',
              browser: {
                enabled: true,
                headless: true,
                provider: playwright(),
                instances: [{ browser: 'chromium' }],
              },
            },
          },
        ],
      },
    }),
  )
})
