import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { constants, gzip } from 'node:zlib'
import { defineConfig, type BuildEnvironmentOptions, type PluginOption, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const PROJECT_ROOT = fileURLToPath(new URL('./', import.meta.url))

const GOOGLE_FONTS_MODULE = 'virtual:google-fonts'
const RESOLVED_GOOGLE_FONTS_MODULE = `\0${GOOGLE_FONTS_MODULE}`

const googleFonts = (): Plugin => {
  return {
    name: 'oversee:google-fonts',
    resolveId: (id) => {
      return id === GOOGLE_FONTS_MODULE ? RESOLVED_GOOGLE_FONTS_MODULE : null
    },
    async load(id) {
      if (id !== RESOLVED_GOOGLE_FONTS_MODULE) {
        return null
      }
      const { APIv2 } = await import('google-font-metadata')
      const fonts = Object.values(APIv2)
        .map(({ family, category, weights }) => {
          return { family, category, weights }
        })
        .sort((a, b) => {
          return a.family.localeCompare(b.family)
        })
      return `export const googleFonts = ${JSON.stringify(fonts)}`
    },
  }
}

const EMBED_MODE = 'embed'
const EMBED_OUT_DIR = 'internal/webui/dist'
const FAVICON_PATH = '/favicon.svg'
const DEV_API_URL = process.env.OVERSEE_DEV_API ?? 'http://localhost:4400'

const inlineFavicon = (): Plugin => {
  return {
    name: 'oversee:inline-favicon',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const svg = await readFile(new URL(`./public${FAVICON_PATH}`, import.meta.url), 'utf8')
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
        return html.replace(`href="${FAVICON_PATH}"`, `href="${dataUri}"`)
      },
    },
  }
}

const compress = promisify(gzip)

const gzipEmbed = (): Plugin => {
  let outDir = ''
  return {
    name: 'oversee:gzip-embed',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async closeBundle() {
      const htmlPath = join(PROJECT_ROOT, outDir, 'index.html')
      const html = await readFile(htmlPath)
      const compressed = await compress(html, { level: constants.Z_BEST_COMPRESSION })
      await writeFile(`${htmlPath}.gz`, compressed)
      await rm(htmlPath)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    googleFonts(),
  ]
  let build: BuildEnvironmentOptions = {}
  if (mode === EMBED_MODE) {
    plugins.push(viteSingleFile(), inlineFavicon(), gzipEmbed())
    build = { outDir: EMBED_OUT_DIR, emptyOutDir: false, copyPublicDir: false }
  }
  return {
    plugins,
    build,
    worker: {
      format: 'es',
      rolldownOptions: { output: { codeSplitting: false } },
    },
    resolve: {
      alias: [{ find: /^@\//, replacement: PROJECT_ROOT }],
    },
    server: {
      proxy: {
        '/api': DEV_API_URL,
        '/ws': { target: DEV_API_URL, ws: true },
      },
    },
  }
})
