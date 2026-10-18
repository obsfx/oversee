declare module 'virtual:google-fonts' {
  export interface GoogleFont {
    family: string
    category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace'
    weights: number[]
  }
  export const googleFonts: GoogleFont[]
}
