import { PathParts } from '@/src/lib/path-parts.ts'

export abstract class LocationLabels {
  static fileLine(path: string, line: number) {
    return `${PathParts.name(path)}:${line}`
  }
}
