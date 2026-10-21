export abstract class PathParts {
  static name(path: string) {
    return path.slice(PathParts.lastSeparator(path) + 1)
  }

  static directory(path: string) {
    const separator = PathParts.lastSeparator(path)
    return separator > 0 ? path.slice(0, separator) : ''
  }

  static matches(path: string, query: string) {
    return path.toLowerCase().includes(query.trim().toLowerCase())
  }

  static segments(path: string) {
    return path.split(/[\\/]/).filter(Boolean)
  }

  private static lastSeparator(path: string) {
    return Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  }
}
