import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

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
        .map(({ family, category }) => {
          return { family, category }
        })
        .sort((a, b) => {
          return a.family.localeCompare(b.family)
        })
      return `export const googleFonts = ${JSON.stringify(fonts)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss(), googleFonts()],
})
