export abstract class ReducedMotion {
  private static readonly query = '(prefers-reduced-motion: reduce)'

  static preferred() {
    return window.matchMedia(ReducedMotion.query).matches
  }
}
