import { type MountOptions, type Mounted, mountAsync } from 'pele/lazy'

export abstract class MermaidDiagrams {
  static readonly language = 'mermaid'

  private static readonly options: MountOptions = { links: false, images: false }

  static handles(language: string | null) {
    return language?.trim().toLowerCase() === MermaidDiagrams.language
  }

  static mount(element: HTMLElement, source: string, onFailed: (failed: boolean) => void) {
    let mounted: Mounted | null = null
    let disposed = false
    const options: MountOptions = {
      ...MermaidDiagrams.options,
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      onRender: () => {
        onFailed(false)
      },
      onError: () => {
        onFailed(true)
      },
    }

    mountAsync(element, source, options).then(
      (result) => {
        if (disposed) {
          result.destroy()
          return
        }
        mounted = result
      },
      () => {
        if (!disposed) {
          onFailed(true)
        }
      },
    )

    return () => {
      disposed = true
      mounted?.destroy()
    }
  }
}
