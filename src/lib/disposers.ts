export abstract class Disposers {
  static all(disposers: readonly (() => void)[]) {
    return () => {
      for (const dispose of disposers) {
        dispose()
      }
    }
  }
}
