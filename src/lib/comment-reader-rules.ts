export type ReadingSize = 'compact' | 'reader'

export abstract class CommentReaderRules {
  static stepOf(key: string) {
    switch (key) {
      case 'ArrowLeft':
      case 'k':
        return -1
      case 'ArrowRight':
      case 'j':
        return 1
      default:
        return null
    }
  }

  static neighborOf<T>(items: T[], index: number, step: number): T | null {
    const next = index + step
    if (index < 0 || next < 0 || next >= items.length) {
      return null
    }
    return items[next]
  }
}
