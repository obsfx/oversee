export abstract class TabKeys {
  static closes(key: string) {
    return key === 'Delete' || key === 'Backspace'
  }

  static next(key: string, current: number, count: number) {
    if (count === 0) {
      return null
    }
    switch (key) {
      case 'ArrowRight':
        return (current + 1) % count
      case 'ArrowLeft':
        return (current - 1 + count) % count
      case 'Home':
        return 0
      case 'End':
        return count - 1
      default:
        return null
    }
  }
}
