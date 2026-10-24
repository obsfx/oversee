export class HeroCanvasElement extends HTMLElement {
  private static readonly elementName = "hero-canvas";

  private stop: (() => void) | null = null;
  private readonly sizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0 && !this.stop) {
      this.mount();
    }
  });

  static register(): void {
    if (!customElements.get(HeroCanvasElement.elementName)) {
      customElements.define(HeroCanvasElement.elementName, HeroCanvasElement);
    }
  }

  connectedCallback(): void {
    this.sizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    this.sizeObserver.disconnect();
    this.stop?.();
    this.stop = null;
  }

  private mount(): void {
    let isStopped = false;
    let stopRuntime: (() => void) | null = null;
    this.stop = () => {
      isStopped = true;
      stopRuntime?.();
    };
    import("@/src/lib/hero/hero-runtime").then(({ HeroRuntime }) => {
      if (isStopped) {
        return;
      }
      stopRuntime = HeroRuntime.create(this, this.dataset.painting ?? "")?.start() ?? null;
    });
  }
}
