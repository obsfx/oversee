export type FaviconFrame = 'open' | 'half' | 'closed'

const ACCENT = '#7c5cc4'

const FRAMES: Record<FaviconFrame, string> = {
  open:
    `<path d="M2.5 16C6 9.5 10.6 6.5 16 6.5S26 9.5 29.5 16C26 22.5 21.4 25.5 16 25.5S6 22.5 2.5 16Z" fill="none" stroke="${ACCENT}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<circle cx="16" cy="16" r="4.6" fill="${ACCENT}"/>`,
  half:
    `<path d="M2.5 16C6 12.4 10.6 10.8 16 10.8S26 12.4 29.5 16C26 20.6 21.4 22.6 16 22.6S6 20.6 2.5 16Z" fill="none" stroke="${ACCENT}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<ellipse cx="16" cy="16.6" rx="4.6" ry="2.6" fill="${ACCENT}"/>`,
  closed: `<path d="M2.5 16C6 20.5 10.6 22.5 16 22.5S26 20.5 29.5 16" fill="none" stroke="${ACCENT}" stroke-width="2.6" stroke-linecap="round"/>`,
}

export abstract class DocumentFavicon {
  static show(frame: FaviconFrame) {
    const link = DocumentFavicon.link()
    link.href = DocumentFavicon.dataUri(frame)
  }

  private static dataUri(frame: FaviconFrame) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${FRAMES[frame]}</svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }

  private static link() {
    const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (existing) {
      return existing
    }
    const created = document.createElement('link')
    created.rel = 'icon'
    created.type = 'image/svg+xml'
    document.head.appendChild(created)
    return created
  }
}
