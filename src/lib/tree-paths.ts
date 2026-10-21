import { PathParts } from '@/src/lib/path-parts.ts'

export abstract class TreePaths {
  static isDirectory(path: string) {
    return path.endsWith('/')
  }

  static directoriesOf(paths: readonly string[]) {
    const directories = new Set<string>()
    for (const path of paths) {
      const segments = path.split('/')
      for (let depth = 1; depth < segments.length; depth++) {
        directories.add(`${segments.slice(0, depth).join('/')}/`)
      }
    }
    return [...directories]
  }

  static singleFile(paths: readonly string[]) {
    const files = paths.filter((path) => {
      return !TreePaths.isDirectory(path)
    })
    return files.length === 1 ? files[0] : null
  }

  static split(path: string) {
    const name = PathParts.name(path)
    return { directory: path.slice(0, path.length - name.length), name }
  }
}
